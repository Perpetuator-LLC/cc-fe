#!/usr/bin/env node
/**
 * Test specific recording's agent actions data
 *
 * Copyright (c) 2026 Perpetuator LLC
 */

const { graphqlQuery } = require('./lib/test-utils.cjs');

async function main() {
  const recordingUuid = process.argv[2] || '58445cd1-ca5b-4c4b-87b9-337e22a7bd9c';

  console.log(`=== Testing Recording Agent Actions: ${recordingUuid} ===\n`);

  const query = `
    query GetPulse($uuid: UUID!) {
      pulse(uuid: $uuid) {
        uuid
        title
        status
        agentActions
      }
    }
  `;

  try {
    const result = await graphqlQuery(query, { uuid: recordingUuid });

    console.log('Recording:', result?.pulse?.title);
    console.log('Status:', result?.pulse?.status);
    console.log('\n=== Agent Actions Raw ===');
    console.log(result?.pulse?.agentActions);

    if (result?.pulse?.agentActions) {
      try {
        const actions = JSON.parse(result.pulse.agentActions);
        console.log('\n=== Parsed Agent Actions ===');
        console.log('Total actions:', actions.length);
        console.log('\nFirst 5 actions:');
        actions.slice(0, 5).forEach((action, i) => {
          console.log(`\n${i + 1}. Action:`, JSON.stringify(action, null, 2));
        });

        // Check for issues
        const missingTool = actions.filter(a => !a.tool);
        const missingStatus = actions.filter(a => !a.status);

        console.log('\n=== Data Quality ===');
        console.log('Actions missing "tool":', missingTool.length);
        console.log('Actions missing "status":', missingStatus.length);

        if (missingTool.length > 0) {
          console.log('\nSample of actions missing tool:');
          console.log(JSON.stringify(missingTool.slice(0, 3), null, 2));
        }
      } catch (e) {
        console.log('Parse error:', e.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main().catch(console.error);
