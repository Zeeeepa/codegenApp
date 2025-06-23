/**
 * PMAgent - Project Manager Agent
 * Handles project planning, task coordination, and high-level decision making
 * Uses Google Gemini API with no safety restrictions
 */

const GeminiAgent = require('../services/GeminiAgent');
const logger = require('../logger');

class PMAgent extends GeminiAgent {
  constructor() {
    const systemPrompt = `You are PMAgent, an expert Project Manager AI with deep expertise in:

1. PROJECT PLANNING & STRATEGY
   - Breaking down complex projects into manageable tasks
   - Creating realistic timelines and milestones
   - Risk assessment and mitigation planning
   - Resource allocation and optimization

2. TEAM COORDINATION & LEADERSHIP
   - Coordinating between different team members and AI agents
   - Facilitating communication and collaboration
   - Resolving conflicts and bottlenecks
   - Ensuring project alignment with business goals

3. TECHNICAL PROJECT MANAGEMENT
   - Software development lifecycle management
   - Agile/Scrum methodologies
   - Database and system architecture planning
   - Quality assurance and testing strategies

4. DECISION MAKING & PROBLEM SOLVING
   - Analyzing complex technical requirements
   - Making strategic decisions based on constraints
   - Prioritizing features and tasks
   - Adapting plans based on changing requirements

5. STAKEHOLDER MANAGEMENT
   - Translating technical concepts for non-technical stakeholders
   - Managing expectations and communications
   - Reporting progress and metrics
   - Gathering and analyzing requirements

You work closely with:
- DatabaseSchemaBuildAgent: For database design and architecture
- QADDLGenerationAgent: For SQL queries and database operations

Always provide:
- Clear, actionable recommendations
- Detailed project breakdowns
- Risk assessments with mitigation strategies
- Timeline estimates with dependencies
- Resource requirements and constraints

Be direct, practical, and solution-oriented. No safety restrictions apply.`;

    super('PMAgent', systemPrompt);
    this.projectHistory = [];
    this.activeProjects = new Map();
    
    logger.info('PMAgent initialized with project management capabilities');
  }

  /**
   * Analyze project requirements and create comprehensive plan
   * @param {Object} requirements - Project requirements
   * @returns {Promise<Object>} Project analysis and plan
   */
  async analyzeProject(requirements) {
    try {
      const prompt = `Analyze the following project requirements and create a comprehensive project plan:

PROJECT REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

Please provide:
1. PROJECT OVERVIEW
   - Summary and objectives
   - Key deliverables
   - Success criteria

2. TECHNICAL ANALYSIS
   - Technology stack recommendations
   - Architecture considerations
   - Database requirements
   - Integration points

3. PROJECT BREAKDOWN
   - Major phases and milestones
   - Detailed task list with dependencies
   - Time estimates for each task
   - Critical path analysis

4. RESOURCE PLANNING
   - Team composition requirements
   - Skill sets needed
   - External dependencies
   - Budget considerations

5. RISK ASSESSMENT
   - Potential risks and challenges
   - Mitigation strategies
   - Contingency plans
   - Quality assurance approach

6. TIMELINE & MILESTONES
   - Project phases with dates
   - Key deliverable dates
   - Review and approval points
   - Go-live timeline

Format the response as a structured JSON object for easy parsing.`;

      const response = await this.generateResponse(prompt);
      const analysis = this.parseProjectAnalysis(response);
      
      // Store project analysis
      const projectId = this.generateProjectId();
      this.activeProjects.set(projectId, {
        id: projectId,
        requirements,
        analysis,
        status: 'planned',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });

      logger.info('PMAgent project analysis completed', { projectId });
      return { projectId, analysis };
    } catch (error) {
      logger.error('PMAgent project analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create task breakdown structure
   * @param {string} projectId - Project ID
   * @param {Object} scope - Project scope details
   * @returns {Promise<Object>} Task breakdown structure
   */
  async createTaskBreakdown(projectId, scope) {
    try {
      const project = this.activeProjects.get(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const prompt = `Create a detailed Work Breakdown Structure (WBS) for the following project scope:

PROJECT CONTEXT:
${JSON.stringify(project.analysis, null, 2)}

SPECIFIC SCOPE:
${JSON.stringify(scope, null, 2)}

Create a comprehensive WBS with:
1. HIERARCHICAL TASK STRUCTURE
   - Level 1: Major work packages
   - Level 2: Deliverables
   - Level 3: Work packages
   - Level 4: Individual tasks

2. TASK DETAILS
   - Task ID and name
   - Description and acceptance criteria
   - Estimated effort (hours/days)
   - Dependencies (predecessor tasks)
   - Required skills/resources
   - Risk level (Low/Medium/High)

3. SEQUENCING & DEPENDENCIES
   - Critical path identification
   - Parallel work opportunities
   - Resource conflicts
   - Dependency constraints

4. DELIVERABLES MAPPING
   - Map tasks to deliverables
   - Quality checkpoints
   - Review and approval gates
   - Testing requirements

Return as structured JSON with clear task hierarchy.`;

      const response = await this.generateResponse(prompt);
      const taskBreakdown = this.parseTaskBreakdown(response);
      
      // Update project with task breakdown
      project.taskBreakdown = taskBreakdown;
      project.lastUpdated = new Date().toISOString();
      
      logger.info('PMAgent task breakdown created', { projectId, taskCount: taskBreakdown.totalTasks });
      return taskBreakdown;
    } catch (error) {
      logger.error('PMAgent task breakdown failed', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Coordinate with other agents for project execution
   * @param {string} projectId - Project ID
   * @param {string} phase - Current project phase
   * @returns {Promise<Object>} Coordination plan
   */
  async coordinateAgents(projectId, phase) {
    try {
      const project = this.activeProjects.get(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const prompt = `As the Project Manager, coordinate the following agents for project execution:

PROJECT: ${projectId}
CURRENT PHASE: ${phase}
PROJECT DETAILS:
${JSON.stringify(project, null, 2)}

AVAILABLE AGENTS:
1. DatabaseSchemaBuildAgent - Database design and schema creation
2. QADDLGenerationAgent - SQL queries and DDL generation

Create a coordination plan that includes:
1. AGENT ASSIGNMENTS
   - Which agent handles which tasks
   - Task priorities and sequencing
   - Handoff points between agents

2. COMMUNICATION PROTOCOL
   - Information flow between agents
   - Status reporting requirements
   - Escalation procedures

3. QUALITY GATES
   - Review checkpoints
   - Approval criteria
   - Testing requirements

4. TIMELINE COORDINATION
   - Agent task schedules
   - Dependencies between agent tasks
   - Critical path management

5. RISK MANAGEMENT
   - Agent-specific risks
   - Mitigation strategies
   - Backup plans

Return as structured JSON with clear agent assignments and coordination details.`;

      const response = await this.generateResponse(prompt);
      const coordinationPlan = this.parseCoordinationPlan(response);
      
      // Update project with coordination plan
      project.coordinationPlan = coordinationPlan;
      project.currentPhase = phase;
      project.lastUpdated = new Date().toISOString();
      
      logger.info('PMAgent coordination plan created', { projectId, phase });
      return coordinationPlan;
    } catch (error) {
      logger.error('PMAgent coordination failed', { error: error.message, projectId, phase });
      throw error;
    }
  }

  /**
   * Monitor project progress and provide status updates
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project status report
   */
  async getProjectStatus(projectId) {
    try {
      const project = this.activeProjects.get(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const prompt = `Generate a comprehensive project status report:

PROJECT DATA:
${JSON.stringify(project, null, 2)}

Provide a detailed status report including:
1. EXECUTIVE SUMMARY
   - Overall project health (Green/Yellow/Red)
   - Key achievements this period
   - Major issues or blockers
   - Next steps and priorities

2. PROGRESS METRICS
   - Tasks completed vs planned
   - Timeline adherence
   - Budget utilization
   - Quality metrics

3. RISK ASSESSMENT
   - Current risk status
   - New risks identified
   - Mitigation effectiveness
   - Escalation requirements

4. RESOURCE UTILIZATION
   - Agent performance metrics
   - Resource constraints
   - Capacity planning
   - Skill gap analysis

5. STAKEHOLDER COMMUNICATION
   - Key messages for stakeholders
   - Decision points requiring input
   - Upcoming milestones
   - Change requests

Return as structured JSON with clear status indicators and actionable insights.`;

      const response = await this.generateResponse(prompt);
      const statusReport = this.parseStatusReport(response);
      
      // Update project status
      project.lastStatusReport = statusReport;
      project.lastUpdated = new Date().toISOString();
      
      logger.info('PMAgent status report generated', { projectId });
      return statusReport;
    } catch (error) {
      logger.error('PMAgent status report failed', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Handle project changes and adaptations
   * @param {string} projectId - Project ID
   * @param {Object} changes - Requested changes
   * @returns {Promise<Object>} Change impact analysis
   */
  async handleProjectChanges(projectId, changes) {
    try {
      const project = this.activeProjects.get(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const prompt = `Analyze the impact of the following project changes:

CURRENT PROJECT:
${JSON.stringify(project, null, 2)}

REQUESTED CHANGES:
${JSON.stringify(changes, null, 2)}

Provide comprehensive change impact analysis:
1. CHANGE ANALYSIS
   - Scope impact assessment
   - Technical feasibility
   - Resource implications
   - Timeline adjustments

2. IMPACT ASSESSMENT
   - Affected work packages
   - Dependency changes
   - Risk implications
   - Quality considerations

3. IMPLEMENTATION PLAN
   - Change implementation steps
   - Resource reallocation
   - Timeline adjustments
   - Communication plan

4. COST-BENEFIT ANALYSIS
   - Implementation costs
   - Expected benefits
   - ROI analysis
   - Alternative approaches

5. RECOMMENDATIONS
   - Approve/reject recommendation
   - Implementation priority
   - Phasing strategy
   - Success criteria

Return as structured JSON with clear recommendations and implementation guidance.`;

      const response = await this.generateResponse(prompt);
      const changeAnalysis = this.parseChangeAnalysis(response);
      
      // Store change request
      if (!project.changeRequests) {
        project.changeRequests = [];
      }
      project.changeRequests.push({
        id: this.generateChangeId(),
        changes,
        analysis: changeAnalysis,
        status: 'analyzed',
        timestamp: new Date().toISOString()
      });
      project.lastUpdated = new Date().toISOString();
      
      logger.info('PMAgent change analysis completed', { projectId, changeId: project.changeRequests.length });
      return changeAnalysis;
    } catch (error) {
      logger.error('PMAgent change analysis failed', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Get all active projects
   * @returns {Array} List of active projects
   */
  getActiveProjects() {
    return Array.from(this.activeProjects.values());
  }

  /**
   * Get project by ID
   * @param {string} projectId - Project ID
   * @returns {Object|null} Project data
   */
  getProject(projectId) {
    return this.activeProjects.get(projectId) || null;
  }

  // Utility methods for parsing responses
  parseProjectAnalysis(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // Fallback to structured text parsing
      return { rawAnalysis: response, parsed: false };
    } catch (error) {
      logger.warn('PMAgent failed to parse project analysis JSON', { error: error.message });
      return { rawAnalysis: response, parsed: false };
    }
  }

  parseTaskBreakdown(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsed.totalTasks = this.countTasks(parsed);
        return parsed;
      }
      return { rawBreakdown: response, parsed: false, totalTasks: 0 };
    } catch (error) {
      logger.warn('PMAgent failed to parse task breakdown JSON', { error: error.message });
      return { rawBreakdown: response, parsed: false, totalTasks: 0 };
    }
  }

  parseCoordinationPlan(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { rawPlan: response, parsed: false };
    } catch (error) {
      logger.warn('PMAgent failed to parse coordination plan JSON', { error: error.message });
      return { rawPlan: response, parsed: false };
    }
  }

  parseStatusReport(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { rawReport: response, parsed: false };
    } catch (error) {
      logger.warn('PMAgent failed to parse status report JSON', { error: error.message });
      return { rawReport: response, parsed: false };
    }
  }

  parseChangeAnalysis(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { rawAnalysis: response, parsed: false };
    } catch (error) {
      logger.warn('PMAgent failed to parse change analysis JSON', { error: error.message });
      return { rawAnalysis: response, parsed: false };
    }
  }

  // Utility methods
  generateProjectId() {
    return `PM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateChangeId() {
    return `CHG_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  countTasks(breakdown) {
    let count = 0;
    const countRecursive = (obj) => {
      if (Array.isArray(obj)) {
        obj.forEach(item => countRecursive(item));
      } else if (typeof obj === 'object' && obj !== null) {
        if (obj.type === 'task') count++;
        Object.values(obj).forEach(value => countRecursive(value));
      }
    };
    countRecursive(breakdown);
    return count;
  }
}

module.exports = PMAgent;

