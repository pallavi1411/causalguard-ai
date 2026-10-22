import Graph from 'graphology';
import { DependencyGraphData, GraphEdge, GraphNode, ProposedChange } from '../types/index.js';
import { DOWNSTREAM_CONSUMERS, EMPLOYEE_SERVICE_CONTRACT } from '../contracts/registry.js';

/**
 * Dependency Graph Engine built on top of Graphology
 * Traces causal links from API fields to downstream consuming microservices
 */
export class DependencyGraphEngine {
  private graph: any;

  constructor() {
    const GraphConstructor = (Graph as any).default || Graph;
    this.graph = new GraphConstructor({ multi: false, type: 'directed' });
    this.initBaseGraph();
  }

  private initBaseGraph() {
    const serviceName = EMPLOYEE_SERVICE_CONTRACT.serviceName;

    // Add Primary Service Node
    this.graph.addNode(serviceName, {
      label: 'Employee Directory Service',
      type: 'SERVICE',
      version: EMPLOYEE_SERVICE_CONTRACT.version,
      endpoint: EMPLOYEE_SERVICE_CONTRACT.endpoint,
    });

    // Add Field Nodes and Exposes Edges
    for (const [fieldName, fieldDef] of Object.entries(EMPLOYEE_SERVICE_CONTRACT.fields)) {
      const fieldNodeId = `field:${fieldName}`;
      if (!this.graph.hasNode(fieldNodeId)) {
        this.graph.addNode(fieldNodeId, {
          label: fieldName,
          type: 'FIELD',
          required: fieldDef.required,
          dataType: fieldDef.type,
        });
      }

      this.graph.addEdge(serviceName, fieldNodeId, {
        relation: 'EXPOSES',
        criticality: fieldDef.required ? 'HIGH' : 'MEDIUM',
      });
    }

    // Add Consumer Nodes and Consumes Edges
    for (const consumer of DOWNSTREAM_CONSUMERS) {
      if (!this.graph.hasNode(consumer.consumerName)) {
        this.graph.addNode(consumer.consumerName, {
          label: consumer.consumerName,
          type: 'CONSUMER',
          criticality: consumer.criticality,
          failureMode: consumer.failureMode,
        });
      }

      for (const fieldName of consumer.consumedFields) {
        const fieldNodeId = `field:${fieldName}`;
        // If field exists in graph, add directed edge from Consumer -> Field (or Field -> Consumer)
        if (this.graph.hasNode(fieldNodeId)) {
          const edgeKey = `${consumer.consumerName}->${fieldNodeId}`;
          if (!this.graph.hasEdge(edgeKey)) {
            this.graph.addEdgeWithKey(edgeKey, consumer.consumerName, fieldNodeId, {
              relation: 'CONSUMES',
              criticality: consumer.criticality === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
            });
          }
        }
      }
    }
  }

  /**
   * Identifies all downstream microservices that consume the given field
   */
  public getAffectedConsumers(serviceName: string, fieldName: string): string[] {
    const fieldNodeId = `field:${fieldName}`;
    if (!this.graph.hasNode(fieldNodeId)) {
      return [];
    }

    const affected: string[] = [];
    // Consumers are in-neighbors of fieldNodeId
    this.graph.inNeighbors(fieldNodeId).forEach((neighbor: string) => {
      const type = this.graph.getNodeAttribute(neighbor, 'type');
      if (type === 'CONSUMER') {
        affected.push(neighbor);
      }
    });

    return affected;
  }

  /**
   * Generates graph export formatted for client rendering and causal path analysis
   */
  public exportGraphData(change?: ProposedChange): DependencyGraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    this.graph.forEachNode((nodeId: string, attributes: any) => {
      nodes.push({
        id: nodeId,
        label: attributes.label || nodeId,
        type: attributes.type,
        metadata: attributes,
      });
    });

    this.graph.forEachEdge((edgeId: string, attributes: any, source: string, target: string) => {
      edges.push({
        id: edgeId,
        source,
        target,
        relation: attributes.relation,
        criticality: attributes.criticality,
      });
    });

    // If there is a proposed rename, add the target proposed field as a new speculative node
    if (change && change.newField) {
      const newFieldId = `field:${change.newField} (PROPOSED)`;
      if (!nodes.some((n) => n.id === newFieldId)) {
        nodes.push({
          id: newFieldId,
          label: `${change.newField} [NEW]`,
          type: 'FIELD',
          metadata: { proposed: true, renameFrom: change.originalField },
        });

        edges.push({
          id: `edge:speculative-expose-${change.newField}`,
          source: change.serviceName,
          target: newFieldId,
          relation: 'MODIFIES',
          criticality: 'CRITICAL',
        });
      }
    }

    // Determine causal breakdown paths
    const targetField = change ? change.originalField : 'employee_id';
    const consumers = this.getAffectedConsumers(change?.serviceName || 'employee-directory-service', targetField);

    const causalPaths = consumers.map((consumerName) => {
      const consumerNode = DOWNSTREAM_CONSUMERS.find((c) => c.consumerName === consumerName);
      return {
        consumer: consumerName,
        targetField,
        riskLevel: (consumerNode?.criticality === 'CRITICAL' ? 'BREAKING' : 'WARNING') as 'BREAKING' | 'WARNING',
        path: [
          change?.serviceName || 'employee-directory-service',
          `field:${targetField}`,
          consumerName,
        ],
      };
    });

    return {
      nodes,
      edges,
      causalPaths,
    };
  }
}
