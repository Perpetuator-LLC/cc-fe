// Test script to verify GraphQL APIs for watchlist data
// Run with: node scripts/test-watchlist-apis.cjs

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Token management (same as test-ws-graphql-v2.cjs)
const TOKEN_DIR = path.join(os.homedir(), '.capital-copilot');
const TOKEN_FILE = path.join(TOKEN_DIR, 'cli-tokens.json');
const ACCESS_TOKEN_BUFFER = 5 * 60 * 1000;

// Load environment config
function loadEnvironment() {
  const envPath = path.join(__dirname, '../src/environments/environment.ts');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file not found: ${envPath}`);
  }
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const extract = (key) => {
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }
      const match = line.match(new RegExp(`${key}:\\s*['"]([^'"]+)['"]`));
      if (match) {
        return match[1];
      }
    }
    return undefined;
  };
  return {
    API_URL: extract('API_URL') || 'http://localhost:8000',
    OAUTH_ISSUER: extract('OAUTH_ISSUER') || extract('API_URL') || 'http://localhost:8000',
    OAUTH_CLIENT_ID: extract('OAUTH_CLIENT_ID'),
    OAUTH_SCOPES: extract('OAUTH_SCOPES') || 'read write',
    TEST_EMAIL: extract('TEST_EMAIL'),
    TEST_PASSWORD: extract('TEST_PASSWORD'),
  };
}

function ensureTokenDir() {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { mode: 0o700 });
  }
}

function loadStoredTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function saveTokens(tokens) {
  ensureTokenDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

function isAccessTokenExpired(tokens) {
  return Date.now() >= tokens.expiresAt - ACCESS_TOKEN_BUFFER;
}

async function loginWithPassword(env) {
  if (!env.TEST_EMAIL || !env.TEST_PASSWORD) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in environment.ts');
  }
  console.log(`   Logging in as ${env.TEST_EMAIL}...`);
  const body = new URLSearchParams({
    grant_type: 'password',
    username: env.TEST_EMAIL,
    password: env.TEST_PASSWORD,
    client_id: env.OAUTH_CLIENT_ID,
    scope: env.OAUTH_SCOPES,
  });
  const response = await fetch(`${env.OAUTH_ISSUER}/o/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Login failed: ${error.error_description || error.error || response.statusText}`);
  }
  const data = await response.json();
  const tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: data.token_type,
    scope: data.scope,
    refreshTokenCreatedAt: Date.now(),
  };
  saveTokens(tokens);
  return tokens;
}

async function getAccessToken() {
  const env = loadEnvironment();
  let tokens = loadStoredTokens();
  if (!tokens || isAccessTokenExpired(tokens)) {
    tokens = await loginWithPassword(env);
  }
  return { token: tokens.accessToken, apiUrl: env.API_URL };
}

async function httpQuery(query, variables = {}, token, apiUrl) {
  const response = await fetch(`${apiUrl}/graphql/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });
  return response.json();
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('WATCHLIST API TESTS');
  console.log('='.repeat(60));
  console.log(`Test time: ${new Date().toISOString()}`);
  console.log('');

  // Get auth token
  console.log('1. Authenticating...');
  let token, apiUrl;
  try {
    const auth = await getAccessToken();
    token = auth.token;
    apiUrl = auth.apiUrl;
    console.log('   ✅ Got auth token');
    console.log(`   API URL: ${apiUrl}`);
  } catch (e) {
    console.log('   ❌ Auth failed:', e.message);
    return;
  }
  console.log('');

  // Test 1: gicsSectors query
  console.log('2. Testing gicsSectors query...');
  try {
    const result = await httpQuery('query { gicsSectors }', {}, token, apiUrl);
    if (result.errors) {
      console.log('   ❌ Error:', JSON.stringify(result.errors));
    } else if (result.data?.gicsSectors) {
      const sectors = result.data.gicsSectors;
      console.log(`   ✅ Got ${sectors.length} sectors`);
      if (sectors.length > 0) {
        console.log('   Sample sectors:', sectors.slice(0, 5).join(', '));
      } else {
        console.log('   ⚠️ EMPTY - No sectors returned!');
      }
    } else {
      console.log('   ❌ Unexpected response:', JSON.stringify(result));
    }
  } catch (e) {
    console.log('   ❌ Failed:', e.message);
  }
  console.log('');

  // Test 2: gicsIndustries query
  console.log('3. Testing gicsIndustries query...');
  try {
    const result = await httpQuery('query { gicsIndustries }', {}, token, apiUrl);
    if (result.errors) {
      console.log('   ❌ Error:', JSON.stringify(result.errors));
    } else if (result.data?.gicsIndustries) {
      const industries = result.data.gicsIndustries;
      console.log(`   ✅ Got ${industries.length} industries`);
      if (industries.length > 0) {
        console.log('   Sample industries:', industries.slice(0, 5).join(', '));
      } else {
        console.log('   ⚠️ EMPTY - No industries returned!');
      }
    } else {
      console.log('   ❌ Unexpected response:', JSON.stringify(result));
    }
  } catch (e) {
    console.log('   ❌ Failed:', e.message);
  }
  console.log('');

  // Test 3: exchanges query
  console.log('4. Testing exchanges query...');
  try {
    const result = await httpQuery('query { exchanges }', {}, token, apiUrl);
    if (result.errors) {
      console.log('   ❌ Error:', JSON.stringify(result.errors));
    } else if (result.data?.exchanges) {
      const exchanges = result.data.exchanges;
      console.log(`   ✅ Got ${exchanges.length} exchanges`);
      if (exchanges.length > 0) {
        console.log('   Exchanges:', exchanges.join(', '));
      }
    } else {
      console.log('   ❌ Unexpected response:', JSON.stringify(result));
    }
  } catch (e) {
    console.log('   ❌ Failed:', e.message);
  }
  console.log('');

  // Test 4: stockListings with marketCap, sector, industry
  console.log('5. Testing stockListings query (with marketCap, sector, industry)...');
  try {
    const query = `
      query {
        stockListings(limit: 10) {
          symbol
          name
          exchange
          assetType
          marketCap
          sector
          industry
        }
      }
    `;
    const result = await httpQuery(query, {}, token, apiUrl);
    if (result.errors) {
      console.log('   ❌ Error:', JSON.stringify(result.errors));
    } else if (result.data?.stockListings) {
      const listings = result.data.stockListings;
      console.log(`   ✅ Got ${listings.length} listings`);

      // Check for marketCap
      const withMarketCap = listings.filter(e => e.marketCap != null);
      console.log(`   - With marketCap: ${withMarketCap.length}/${listings.length}`);

      // Check for sector
      const withSector = listings.filter(e => e.sector);
      console.log(`   - With sector: ${withSector.length}/${listings.length}`);

      // Check for industry
      const withIndustry = listings.filter(e => e.industry);
      console.log(`   - With industry: ${withIndustry.length}/${listings.length}`);

      // Sample data
      if (listings.length > 0) {
        console.log('   Sample:', JSON.stringify(listings[0], null, 2).split('\n').map(l => '      ' + l).join('\n'));
      }
    } else {
      console.log('   ❌ Unexpected response:', JSON.stringify(result));
    }
  } catch (e) {
    console.log('   ❌ Failed:', e.message);
  }
  console.log('');

  // Test 5: commands query (for FUNDAMENTALS/FINANCIALS)
  console.log('6. Testing commands query (looking for FUNDAMENTALS/FINANCIALS)...');
  try {
    const query = `
      query {
        commands {
          name
          description
          category
        }
      }
    `;
    const result = await httpQuery(query, {}, token, apiUrl);
    if (result.errors) {
      console.log('   ❌ Error:', JSON.stringify(result.errors));
    } else if (result.data?.commands) {
      const commands = result.data.commands;
      console.log(`   ✅ Got ${commands.length} commands`);

      // Look for FUNDAMENTALS or FINANCIALS
      const fundCommand = commands.find(c =>
        c.name.toUpperCase() === 'FUNDAMENTALS' ||
        c.name.toUpperCase() === 'FUND'
      );
      const finCommand = commands.find(c =>
        c.name.toUpperCase() === 'FINANCIALS' ||
        c.name.toUpperCase() === 'FA'
      );

      if (fundCommand) {
        console.log('   ✅ FUNDAMENTALS command found:', JSON.stringify(fundCommand));
      } else {
        console.log('   ⚠️ FUNDAMENTALS command NOT FOUND');
      }

      if (finCommand) {
        console.log('   ✅ FINANCIALS command found:', JSON.stringify(finCommand));
      } else {
        console.log('   ⚠️ FINANCIALS command NOT FOUND');
      }

      console.log('   Available commands:', commands.map(c => c.name).join(', '));
    } else {
      console.log('   ❌ Unexpected response:', JSON.stringify(result));
    }
  } catch (e) {
    console.log('   ❌ Failed:', e.message);
  }
  console.log('');

  // Test 6: allSectorSymbols query
  console.log('7. Testing allSectorSymbols query (TECHNOLOGY)...');
  try {
    const query = `
      query AllSectorSymbols($sector: String!, $limit: Int) {
        allSectorSymbols(sector: $sector, limit: $limit) {
          symbol
          displayName
          marketCap
          sector
          industry
        }
      }
    `;
    const result = await httpQuery(query, { sector: 'TECHNOLOGY', limit: 10 }, token, apiUrl);
    if (result.errors) {
      console.log('   ❌ Error:', JSON.stringify(result.errors));
    } else if (result.data?.allSectorSymbols) {
      const symbols = result.data.allSectorSymbols;
      console.log(`   ✅ Got ${symbols.length} TECHNOLOGY stocks`);
      if (symbols.length > 0) {
        console.log('   Sample symbols:', symbols.slice(0, 5).map(s => s.symbol).join(', '));
      } else {
        console.log('   ⚠️ EMPTY - No TECHNOLOGY stocks returned!');
      }
    } else {
      console.log('   ❌ Unexpected response:', JSON.stringify(result));
    }
  } catch (e) {
    console.log('   ❌ Failed:', e.message);
  }
  console.log('');

  // Test 7: allIndustrySymbols query
  console.log('8. Testing allIndustrySymbols query (SOFTWARE - APPLICATION)...');
  try {
    const query = `
      query AllIndustrySymbols($industry: String!, $limit: Int) {
        allIndustrySymbols(industry: $industry, limit: $limit) {
          symbol
          displayName
          marketCap
          sector
          industry
        }
      }
    `;
    const result = await httpQuery(query, { industry: 'SOFTWARE - APPLICATION', limit: 10 }, token, apiUrl);
    if (result.errors) {
      console.log('   ❌ Error:', JSON.stringify(result.errors));
    } else if (result.data?.allIndustrySymbols) {
      const symbols = result.data.allIndustrySymbols;
      console.log(`   ✅ Got ${symbols.length} SOFTWARE - APPLICATION stocks`);
      if (symbols.length > 0) {
        console.log('   Sample symbols:', symbols.slice(0, 5).map(s => s.symbol).join(', '));
      } else {
        console.log('   ⚠️ EMPTY - No stocks returned!');
      }
    } else {
      console.log('   ❌ Unexpected response:', JSON.stringify(result));
    }
  } catch (e) {
    console.log('   ❌ Failed:', e.message);
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('TESTS COMPLETE');
  console.log('='.repeat(60));
}

runTests().catch(console.error);

