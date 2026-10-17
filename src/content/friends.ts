// The friends who agreed to be shown on the site. This is the ONLY place their photos, names and words live: nothing is
// invented anywhere else, and nothing renders until an entry is added here.
//
// To add one:
//   1. Put their photo in public/friends/ (square, under 200 KB), e.g. public/friends/kofi.jpg
//   2. Add an entry below. `major` must be a major's exact name from the site (the score is read from the data, not typed),
//      and `quote` is their own words, only if they gave you one. Leave `quote` out otherwise.
//
// Only add people who said yes to appearing with their face, first name and major on a public page.

export interface Friend {
  /** First name only. */
  name: string;
  /** Photo path under /public, e.g. "/friends/kofi.jpg". */
  photo: string;
  /** The exact name of the major they scanned. */
  major: string;
  /** Their own words, if they gave you some. */
  quote?: string;
}

export const FRIENDS: Friend[] = [];
