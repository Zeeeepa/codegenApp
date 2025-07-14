"""
Event Bus Implementation

Provides centralized event-driven communication between library kit components.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable, Set
from uuid import uuid4
import json

logger = logging.getLogger(__name__)


@dataclass
class Event:
    """Base event structure for inter-component communication"""
    
    event_type: str
    source_component: str
    payload: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    correlation_id: str = field(default_factory=lambda: str(uuid4()))
    target_component: Optional[str] = None
    workflow_id: Optional[str] = None
    priority: int = 0  # Higher numbers = higher priority
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization"""
        return {
            "event_type": self.event_type,
            "source_component": self.source_component,
            "target_component": self.target_component,
            "payload": self.payload,
            "timestamp": self.timestamp.isoformat(),
            "correlation_id": self.correlation_id,
            "workflow_id": self.workflow_id,
            "priority": self.priority
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Event":
        """Create event from dictionary"""
        data = data.copy()
        if "timestamp" in data:
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)


class EventHandler(ABC):
    """Abstract base class for event handlers"""
    
    @abstractmethod
    async def handle_event(self, event: Event) -> Optional[Event]:
        """
        Handle incoming event and optionally return response event
        
        Args:
            event: The event to handle
            
        Returns:
            Optional response event
        """
        pass
    
    @property
    @abstractmethod
    def handled_event_types(self) -> Set[str]:
        """Set of event types this handler can process"""
        pass


class EventSubscription:
    """Represents an event subscription"""
    
    def __init__(
        self,
        event_type: str,
        handler: EventHandler,
        component_name: str,
        filter_func: Optional[Callable[[Event], bool]] = None
    ):
        self.event_type = event_type
        self.handler = handler
        self.component_name = component_name
        self.filter_func = filter_func
        self.subscription_id = str(uuid4())
    
    def matches(self, event: Event) -> bool:
        """Check if this subscription matches the given event"""
        if event.event_type != self.event_type:
            return False
        
        if self.filter_func and not self.filter_func(event):
            return False
        
        return True


class EventBus:
    """
    Centralized event bus for inter-component communication
    
    Features:
    - Async event publishing and handling
    - Event filtering and routing
    - Priority-based event processing
    - Event persistence and replay
    - Metrics and monitoring
    """
    
    def __init__(self, max_queue_size: int = 10000):
        self.subscriptions: Dict[str, List[EventSubscription]] = {}
        self.event_queue: asyncio.PriorityQueue = asyncio.PriorityQueue(maxsize=max_queue_size)
        self.event_history: List[Event] = []
        self.max_history_size = 1000
        self.running = False
        self.worker_task: Optional[asyncio.Task] = None
        self.metrics = {
            "events_published": 0,
            "events_processed": 0,
            "events_failed": 0,
            "active_subscriptions": 0
        }
    
    async def start(self):
        """Start the event bus worker"""
        if self.running:
            return
        
        self.running = True
        self.worker_task = asyncio.create_task(self._event_worker())
        logger.info("Event bus started")
    
    async def stop(self):
        """Stop the event bus worker"""
        if not self.running:
            return
        
        self.running = False
        
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Event bus stopped")
    
    def subscribe(
        self,
        event_type: str,
        handler: EventHandler,
        component_name: str,
        filter_func: Optional[Callable[[Event], bool]] = None
    ) -> str:
        """
        Subscribe to events of a specific type
        
        Args:
            event_type: Type of events to subscribe to
            handler: Event handler instance
            component_name: Name of the subscribing component
            filter_func: Optional filter function for events
            
        Returns:
            Subscription ID
        """
        subscription = EventSubscription(event_type, handler, component_name, filter_func)
        
        if event_type not in self.subscriptions:
            self.subscriptions[event_type] = []
        
        self.subscriptions[event_type].append(subscription)
        self.metrics["active_subscriptions"] += 1
        
        logger.info(f"Component '{component_name}' subscribed to '{event_type}' events")
        return subscription.subscription_id
    
    def unsubscribe(self, subscription_id: str) -> bool:
        """
        Unsubscribe from events
        
        Args:
            subscription_id: ID of the subscription to remove
            
        Returns:
            True if subscription was found and removed
        """
        for event_type, subscriptions in self.subscriptions.items():
            for i, subscription in enumerate(subscriptions):
                if subscription.subscription_id == subscription_id:
                    subscriptions.pop(i)
                    self.metrics["active_subscriptions"] -= 1
                    logger.info(f"Unsubscribed {subscription_id} from '{event_type}' events")
                    return True
        
        return False
    
    async def publish(self, event: Event) -> None:
        """
        Publish an event to the bus
        
        Args:
            event: Event to publish
        """
        try:
            # Add to queue with priority (negative for max-heap behavior)
            await self.event_queue.put((-event.priority, event))
            self.metrics["events_published"] += 1
            
            logger.debug(f"Published event: {event.event_type} from {event.source_component}")
            
        except asyncio.QueueFull:
            logger.error(f"Event queue full, dropping event: {event.event_type}")
            self.metrics["events_failed"] += 1
    
    async def publish_and_wait(self, event: Event, timeout: float = 30.0) -> List[Event]:
        """
        Publish an event and wait for response events
        
        Args:
            event: Event to publish
            timeout: Maximum time to wait for responses
            
        Returns:
            List of response events
        """
        response_events = []
        correlation_id = event.correlation_id
        
        # Create a future to collect responses
        response_future = asyncio.Future()
        response_collector = []
        
        # Subscribe to response events
        def response_filter(e: Event) -> bool:
            return e.correlation_id == correlation_id and e.source_component != event.source_component
        
        class ResponseHandler(EventHandler):
            @property
            def handled_event_types(self) -> Set[str]:
                return {"*"}  # Handle all event types for responses
            
            async def handle_event(self, e: Event) -> Optional[Event]:
                if response_filter(e):
                    response_collector.append(e)
                return None
        
        handler = ResponseHandler()
        subscription_id = self.subscribe("*", handler, "response_collector", response_filter)
        
        try:
            # Publish the original event
            await self.publish(event)
            
            # Wait for responses or timeout
            await asyncio.wait_for(asyncio.sleep(timeout), timeout=timeout)
            
        except asyncio.TimeoutError:
            pass
        finally:
            # Cleanup subscription
            self.unsubscribe(subscription_id)
        
        return response_collector
    
    async def _event_worker(self):
        """Background worker that processes events from the queue"""
        while self.running:
            try:
                # Get next event from queue
                priority, event = await asyncio.wait_for(
                    self.event_queue.get(), 
                    timeout=1.0
                )
                
                # Add to history
                self._add_to_history(event)
                
                # Process event
                await self._process_event(event)
                
                self.metrics["events_processed"] += 1
                
            except asyncio.TimeoutError:
                # No events in queue, continue
                continue
            except Exception as e:
                logger.error(f"Error processing event: {e}")
                self.metrics["events_failed"] += 1
    
    async def _process_event(self, event: Event):
        """Process a single event by routing to appropriate handlers"""
        event_type = event.event_type
        
        # Get subscriptions for this event type
        subscriptions = self.subscriptions.get(event_type, [])
        
        # Also check for wildcard subscriptions
        wildcard_subscriptions = self.subscriptions.get("*", [])
        all_subscriptions = subscriptions + wildcard_subscriptions
        
        if not all_subscriptions:
            logger.debug(f"No handlers for event type: {event_type}")
            return
        
        # Process each matching subscription
        tasks = []
        for subscription in all_subscriptions:
            if subscription.matches(event):
                task = asyncio.create_task(
                    self._handle_event_safely(subscription, event)
                )
                tasks.append(task)
        
        if tasks:
            # Wait for all handlers to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process any response events
            for result in results:
                if isinstance(result, Event):
                    await self.publish(result)
                elif isinstance(result, Exception):
                    logger.error(f"Event handler error: {result}")
    
    async def _handle_event_safely(self, subscription: EventSubscription, event: Event) -> Optional[Event]:
        """Safely handle an event with error catching"""
        try:
            return await subscription.handler.handle_event(event)
        except Exception as e:
            logger.error(
                f"Error in event handler for {subscription.component_name}: {e}",
                exc_info=True
            )
            return None
    
    def _add_to_history(self, event: Event):
        """Add event to history with size limit"""
        self.event_history.append(event)
        
        # Trim history if too large
        if len(self.event_history) > self.max_history_size:
            self.event_history = self.event_history[-self.max_history_size:]
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get event bus metrics"""
        return {
            **self.metrics,
            "queue_size": self.event_queue.qsize(),
            "history_size": len(self.event_history),
            "subscription_count_by_type": {
                event_type: len(subs) 
                for event_type, subs in self.subscriptions.items()
            }
        }
    
    def get_recent_events(self, limit: int = 100) -> List[Event]:
        """Get recent events from history"""
        return self.event_history[-limit:]
    
    async def replay_events(
        self, 
        event_filter: Optional[Callable[[Event], bool]] = None,
        target_component: Optional[str] = None
    ):
        """
        Replay events from history
        
        Args:
            event_filter: Optional filter function for events to replay
            target_component: Optional target component for replayed events
        """
        events_to_replay = self.event_history
        
        if event_filter:
            events_to_replay = [e for e in events_to_replay if event_filter(e)]
        
        for event in events_to_replay:
            # Create new event with updated target if specified
            if target_component:
                replayed_event = Event(
                    event_type=f"replay.{event.event_type}",
                    source_component="event_bus",
                    target_component=target_component,
                    payload=event.payload,
                    correlation_id=str(uuid4()),
                    workflow_id=event.workflow_id
                )
            else:
                replayed_event = event
            
            await self.publish(replayed_event)
        
        logger.info(f"Replayed {len(events_to_replay)} events")


# Predefined event types
class EventTypes:
    """Standard event types used across the library kit"""
    
    # Workflow events
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"
    WORKFLOW_CANCELLED = "workflow.cancelled"
    WORKFLOW_STEP_STARTED = "workflow.step.started"
    WORKFLOW_STEP_COMPLETED = "workflow.step.completed"
    WORKFLOW_STEP_FAILED = "workflow.step.failed"
    
    # Resource events
    SANDBOX_CREATED = "sandbox.created"
    SANDBOX_DESTROYED = "sandbox.destroyed"
    SANDBOX_STATUS_CHANGED = "sandbox.status_changed"
    SANDBOX_ERROR = "sandbox.error"
    
    # Analysis events
    CODE_ANALYSIS_STARTED = "analysis.started"
    CODE_ANALYSIS_COMPLETED = "analysis.completed"
    CODE_ANALYSIS_FAILED = "analysis.failed"
    REFACTORING_SUGGESTED = "analysis.refactoring_suggested"
    
    # Evaluation events
    WEB_EVALUATION_STARTED = "evaluation.started"
    WEB_EVALUATION_COMPLETED = "evaluation.completed"
    WEB_EVALUATION_FAILED = "evaluation.failed"
    SECURITY_ISSUE_FOUND = "evaluation.security_issue"
    
    # Agent events
    AGENT_RUN_STARTED = "agent.run.started"
    AGENT_RUN_COMPLETED = "agent.run.completed"
    AGENT_RUN_FAILED = "agent.run.failed"
    
    # System events
    COMPONENT_STARTED = "system.component.started"
    COMPONENT_STOPPED = "system.component.stopped"
    COMPONENT_ERROR = "system.component.error"
    HEALTH_CHECK = "system.health_check"


# Global event bus instance
_global_event_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Get the global event bus instance"""
    global _global_event_bus
    if _global_event_bus is None:
        _global_event_bus = EventBus()
    return _global_event_bus


async def initialize_event_bus() -> EventBus:
    """Initialize and start the global event bus"""
    event_bus = get_event_bus()
    await event_bus.start()
    return event_bus


async def shutdown_event_bus():
    """Shutdown the global event bus"""
    global _global_event_bus
    if _global_event_bus:
        await _global_event_bus.stop()
        _global_event_bus = None

