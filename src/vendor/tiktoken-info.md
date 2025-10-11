# Tiktoken Integration Guide

## Current Status

This extension currently uses a **simplified tokenizer fallback** that approximates tokens using a 4:1 character-to-token ratio. This is NOT accurate for production use.

## How to Add Real Tiktoken Support

### Option 1: Use @dqbd/tiktoken (Recommended)

1. **Install the package:**
   ```bash
   npm install @dqbd/tiktoken
   ```

2. **Build for browser:**
   ```bash
   # Using esbuild or webpack to bundle for the browser
   npx esbuild node_modules/@dqbd/tiktoken/dist/tiktoken.js --bundle --outfile=src/vendor/tiktoken.min.js --format=esm
   ```

3. **Copy WASM file:**
   ```bash
   cp node_modules/@dqbd/tiktoken/tiktoken_bg.wasm src/vendor/
   ```

4. **Update meter-core.js:**
   Replace the `SimpleTokenizer` class with:
   ```javascript
   import { Tiktoken } from './vendor/tiktoken.min.js';
   import { load } from './vendor/tiktoken.min.js';

   async function initTokenizer() {
     if (tokenizer) return tokenizer;

     try {
       const wasmUrl = chrome.runtime.getURL('src/vendor/tiktoken_bg.wasm');
       await load(fetch(wasmUrl));

       // Initialize with cl100k_base (GPT-4, GPT-3.5)
       tokenizer = new Tiktoken(
         cl100k_base.bpe_ranks,
         cl100k_base.special_tokens,
         cl100k_base.pat_str
       );

       return tokenizer;
     } catch (error) {
       console.error('[Revenium] Tiktoken init failed:', error);
       throw error;
     }
   }
   ```

### Option 2: Use js-tiktoken (Alternative)

1. **Install:**
   ```bash
   npm install js-tiktoken
   ```

2. **Bundle and include in vendor directory**

3. **Update meter-core.js** to use the js-tiktoken API

### Option 3: Use OpenAI's tiktoken-node (Not browser-compatible)

This is only suitable if you run a local Node.js service alongside the extension.

## Encoding Models

- **cl100k_base**: GPT-4, GPT-3.5, text-embedding-ada-002
- **p50k_base**: Codex models, text-davinci-002, text-davinci-003
- **o200k_base**: GPT-4o, o1 models

## Testing Token Counts

Compare your token counts with OpenAI's tokenizer tool:
https://platform.openai.com/tokenizer

## Performance Considerations

- Initialize tokenizer lazily (only when needed)
- Use throttled tokenization during streaming (every 90ms)
- Always do final re-tokenization when stream completes
- Consider caching tokenized results for common prompts

## Fallback Strategy

If tokenization fails:
1. Use character approximation (current fallback)
2. Log warning to console
3. Mark metrics as "estimated" in UI
4. Allow users to manually input token counts in settings
