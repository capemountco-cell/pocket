/**
 * Where the discovery screen looks for a site to open on mount.
 *
 * Its own module because three screens need it and none of them should be
 * importing a route from another route: History sets it, Explore sets it, and
 * the discovery screen consumes it. Routes importing routes is how a page
 * ends up pulling a whole other page's bundle in behind a constant.
 */
export const OPEN_SITE_KEY = "app_open_site_v1";
