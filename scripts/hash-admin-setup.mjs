#!/usr/bin/env node
/** Generate the encryption key and session secret for the admin Worker. */
import { webcrypto as crypto } from 'node:crypto';
import { stdout } from 'node:process';

const randomSecret = () =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(48))).toString('base64url');

stdout.write(`CONFIG_KEY=${randomSecret()}\n`);
stdout.write(`SESSION_SECRET=${randomSecret()}\n`);
