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
            logger.error("Event queue is full, dropping event")
            raise
    
    async def _event_worker(self):
        """Background worker to process events"""
        while self.running:
            try:
                # Get next event from queue
                priority, event = await asyncio.wait_for(
                    self.event_queue.get(), 
                    timeout=1.0
                )
                
                # Add to history
                self._add_to_history(event)
                
                # Find matching subscriptions
                matching_subscriptions = self._find_matching_subscriptions(event)
                
                # Process event with all matching handlers
                await self._process_event(event, matching_subscriptions)
                
                self.metrics["events_processed"] += 1
                
            except asyncio.TimeoutError:
                # No events to process, continue
                continue
            except Exception as e:
                logger.error(f"Error processing event: {e}")
                self.metrics["events_failed"] += 1
    
    def _find_matching_subscriptions(self, event: Event) -> List[EventSubscription]:
        """Find subscriptions that match the given event"""
        matching = []
        
        # Check subscriptions for this event type
        if event.event_type in self.subscriptions:
            for subscription in self.subscriptions[event.event_type]:
                if subscription.matches(event):
                    matching.append(subscription)
        
        # Check wildcard subscriptions
        if "*" in self.subscriptions:
            for subscription in self.subscriptions["*"]:
                if subscription.matches(event):
                    matching.append(subscription)
        
        return matching
    
    async def _process_event(self, event: Event, subscriptions: List[EventSubscription]):
        """Process event with matching subscriptions"""
        tasks = []
        
        for subscription in subscriptions:
            # Create task for each handler
            task = asyncio.create_task(
                self._handle_event_safely(subscription, event)
            )
            tasks.append(task)
        
        # Wait for all handlers to complete
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process any response events
            for result in results:
                if isinstance(result, Event):
                    await self.publish(result)
                elif isinstance(result, Exception):
                    logger.error(f"Event handler failed: {result}")
    
    async def _handle_event_safely(self, subscription: EventSubscription, event: Event) -> Optional[Event]:
        """Safely handle event with error catching"""
        try:
            return await subscription.handler.handle_event(event)
        except Exception as e:
            logger.error(f"Handler {subscription.component_name} failed for event {event.event_type}: {e}")
            return None
    
    def _add_to_history(self, event: Event):
        """Add event to history with size limit"""
        self.event_history.append(event)
        
        # Trim history if too large
        if len(self.event_history) > self.max_history_size:
            self.event_history = self.event_history[-self.max_history_size:]
    
    def get_event_history(
        self, 
        event_type: Optional[str] = None,
        component: Optional[str] = None,
        limit: int = 100
    ) -> List[Event]:
        """
        Get event history with optional filtering
        
        Args:
            event_type: Filter by event type
            component: Filter by source component
            limit: Maximum number of events to return
            
        Returns:
            List of events matching criteria
        """
        events = self.event_history
        
        # Apply filters
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        
        if component:
            events = [e for e in events if e.source_component == component]
        
        # Sort by timestamp (newest first) and limit
        events.sort(key=lambda e: e.timestamp, reverse=True)
        return events[:limit]
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get event bus metrics"""
        return self.metrics.copy()


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
    global _global_event_bus
    _global_event_bus = EventBus()
    await _global_event_bus.start()
    return _global_event_bus

