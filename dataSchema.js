const dataSchema = {
    type: 'object',
    properties: {
      planCostShares: {
        type: 'object',
        properties: {
          deductible: { type: 'number' },
          _org: { type: 'string', const: 'example.com' },
          copay: { type: 'number' },
          objectId: { type: 'string' },
          objectType: { type: 'string', const: 'membercostshare' },
        },
        required: ['deductible', '_org', 'copay', 'objectId', 'objectType'],
      },
      linkedPlanServices: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            linkedService: {
              type: 'object',
              properties: {
                _org: { type: 'string', const: 'example.com' },
                objectId: { type: 'string' },
                objectType: { type: 'string', const: 'service' },
                name: { type: 'string' },
              },
              required: ['_org', 'objectId', 'objectType', 'name'],
            },
            planserviceCostShares: {
              type: 'object',
              properties: {
                deductible: { type: 'number' },
                _org: { type: 'string', const: 'example.com' },
                copay: { type: 'number' },
                objectId: { type: 'string' },
                objectType: { type: 'string', const: 'membercostshare' },
              },
              required: ['deductible', '_org', 'copay', 'objectId', 'objectType'],
            },
            _org: { type: 'string', const: 'example.com' },
            objectId: { type: 'string' },
            objectType: { type: 'string', const: 'planservice' },
          },
          required: ['linkedService', 'planserviceCostShares', '_org', 'objectId', 'objectType'],
        },
      },
      _org: { type: 'string', const: 'example.com' },
      objectId: { type: 'string' },
      objectType: { type: 'string', const: 'plan' },
      planType: { type: 'string', const: 'inNetwork' },
      creationDate: { type: 'string' },
    },
    required: ['planCostShares', '_org', 'objectId', 'objectType', 'planType', 'creationDate'],
  };

module.exports = dataSchema;
