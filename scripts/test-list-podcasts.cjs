#!/usr/bin/env node
/**
 * List podcasts to get UUIDs for testing
 * 
 * Usage:
 *   node scripts/test-list-podcasts.cjs
 * 
 * Copyright (c) 2026 Perpetuator LLC
 */

const { graphqlQuery } = require('./lib/test-utils.cjs');

async function listPodcasts() {
  console.log('Querying podcasts...\n');
  
  const query = `
    query ListPodcasts {
      podcasts(first: 10) {
        edges {
          node {
            uuid
            name
            imageUrl
            thumbnailUrl
          }
        }
      }
    }
  `;
  
  try {
    const data = await graphqlQuery(query);
    
    if (data.podcasts?.edges?.length > 0) {
      console.log('Podcasts found:\n');
      data.podcasts.edges.forEach((edge, i) => {
        const podcast = edge.node;
        console.log(`${i + 1}. ${podcast.name}`);
        console.log(`   UUID: ${podcast.uuid}`);
        console.log(`   Image: ${podcast.imageUrl || 'No image'}`);
        console.log('');
      });
    } else {
      console.log('No podcasts found');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listPodcasts();
