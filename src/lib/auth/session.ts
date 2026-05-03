/** App auth shape (Clerk or SKIP_AUTH dev user), kept compatible with todo/actions code. */
export type AppSession = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  expires?: string;
};
