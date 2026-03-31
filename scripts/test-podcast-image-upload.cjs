#!/usr/bin/env node
/**
 * Test podcast image upload via GraphQL
 * 
 * Usage:
 *   node scripts/test-podcast-image-upload.cjs <podcast-uuid> <image-path>
 *   node scripts/test-podcast-image-upload.cjs 12345678-1234-1234-1234-123456789012 /path/to/image.jpg
 * 
 * Copyright (c) 2026 Perpetuator LLC
 */

const { getAccessToken, loadEnvironment } = require('./lib/test-utils.cjs');
const fs = require('fs');
const path = require('path');

async function uploadPodcastImage(podcastUuid, imagePath) {
  console.log('='.repeat(60));
  console.log('Podcast Image Upload Test');
  console.log('='.repeat(60));
  
  // Verify file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`Error: File not found: ${imagePath}`);
    process.exit(1);
  }
  
  const stats = fs.statSync(imagePath);
  console.log(`\nFile: ${imagePath}`);
  console.log(`Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
  console.log(`Podcast UUID: ${podcastUuid}`);
  
  const env = loadEnvironment();
  console.log(`\nAPI URL: ${env.API_URL}`);
  
  // Get access token
  console.log('\nAuthenticating...');
  const accessToken = await getAccessToken();
  console.log('Authentication successful');
  
  // Prepare the GraphQL multipart request
  const graphqlEndpoint = `${env.API_URL}/graphql/`;
  
  const query = `
    mutation UpdatePodcastImage($podcastUuid: UUID!, $image: Upload!) {
      updatePodcast(podcastUuid: $podcastUuid, image: $image) {
        success
        message
        podcast {
          id
          uuid
          name
          imageUrl
          thumbnailUrl
        }
      }
    }
  `;
  
  const operations = JSON.stringify({
    query,
    variables: {
      podcastUuid,
      image: null, // Will be mapped
    },
  });
  
  const map = JSON.stringify({
    '0': ['variables.image'],
  });
  
  // Build multipart request body manually
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const fileContent = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);
  
  // Create multipart body
  let body = '';
  
  // Operations part
  body += `--${boundary}\r\n`;
  body += 'Content-Disposition: form-data; name="operations"\r\n\r\n';
  body += operations + '\r\n';
  
  // Map part  
  body += `--${boundary}\r\n`;
  body += 'Content-Disposition: form-data; name="map"\r\n\r\n';
  body += map + '\r\n';
  
  // File part - we need to build this as a Buffer
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="0"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`;
  const fileFooter = `\r\n--${boundary}--\r\n`;
  
  // Combine into final body
  const bodyBuffer = Buffer.concat([
    Buffer.from(body, 'utf8'),
    Buffer.from(fileHeader, 'utf8'),
    fileContent,
    Buffer.from(fileFooter, 'utf8'),
  ]);
  
  console.log('\nUploading image...');
  console.log(`Endpoint: ${graphqlEndpoint}`);
  console.log(`Body size: ${bodyBuffer.length} bytes`);
  
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });
    
    console.log(`\nResponse status: ${response.status} ${response.statusText}`);
    
    const rawText = await response.text();
    console.log('\nRaw response:');
    console.log(rawText.substring(0, 2000));
    
    let data;
    try {
      data = JSON.parse(rawText);
      console.log('\nParsed response:');
      console.log(JSON.stringify(data, null, 2));
    } catch {
      console.log('\nCould not parse as JSON');
      return;
    }
    
    if (data.errors) {
      console.error('\n❌ GraphQL Errors:');
      data.errors.forEach((err, i) => {
        console.error(`  ${i + 1}. ${err.message}`);
      });
      process.exit(1);
    }
    
    if (data.data?.updatePodcast) {
      const result = data.data.updatePodcast;
      if (result.success) {
        console.log('\n✅ Upload successful!');
        console.log(`   Image URL: ${result.podcast?.imageUrl || 'N/A'}`);
        console.log(`   Thumbnail URL: ${result.podcast?.thumbnailUrl || 'N/A'}`);
      } else {
        console.error(`\n❌ Upload failed: ${result.message}`);
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node scripts/test-podcast-image-upload.cjs <podcast-uuid> <image-path>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/test-podcast-image-upload.cjs 12345678-1234-1234-1234-123456789012 ~/Downloads/image.jpg');
  process.exit(1);
}

const podcastUuid = args[0];
const imagePath = args[1];

uploadPodcastImage(podcastUuid, imagePath);
