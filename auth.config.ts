import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { defineConfig } from 'auth-astro';

const githubId = import.meta.env.GITHUB_CLIENT_ID;
const githubSecret = import.meta.env.GITHUB_CLIENT_SECRET;
const googleId = import.meta.env.GOOGLE_CLIENT_ID;
const googleSecret = import.meta.env.GOOGLE_CLIENT_SECRET;

const providers = [];

if (githubId && githubSecret) {
  providers.push(
    GitHub({
      clientId: githubId,
      clientSecret: githubSecret,
    }),
  );
}

if (googleId && googleSecret) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
    }),
  );
}

export default defineConfig({
  trustHost: true,
  providers,
});
