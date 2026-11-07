export type RouteParams = {
  [key: string]: string;
};

export type RouteConfig = {
  path: string;
  name: string;
};

// Route configuration
export const routes: RouteConfig[] = [
  {
    name: "Home",
    path: "/",
  },
  {
    name: "Jobs",
    path: "/jobs",
  },
  {
    name: "Job Details",
    path: "/jobs/[slug]",
  },
  {
    name: "Job Type",
    path: "/jobs/type/[type]",
  },
  {
    name: "Career Level",
    path: "/jobs/level/[level]",
  },
  {
    name: "Language",
    path: "/jobs/language/[language]",
  },
  {
    name: "Location",
    path: "/jobs/location/[location]",
  },
  {
    name: "Job Types",
    path: "/jobs/types",
  },
  {
    name: "Career Levels",
    path: "/jobs/levels",
  },
  {
    name: "Languages",
    path: "/jobs/languages",
  },
  {
    name: "Job Locations",
    path: "/jobs/locations",
  },
  {
    name: "Pricing",
    path: "/pricing",
  },
  {
    name: "About",
    path: "/about",
  },
  {
    name: "Contact",
    path: "/contact",
  },
  {
    name: "FAQ",
    path: "/faq",
  },
  {
    name: "Job Alerts",
    path: "/job-alerts",
  },
  {
    name: "Changelog",
    path: "/changelog",
  },
];

// Helper function to match a path against route configurations
export function matchRoute(path: string): RouteConfig | undefined {
  return routes.find((route) => {
    // Check if route has dynamic parameters (contains [param] syntax)
    if (route.path.includes("[")) {
      // Convert route path to regex pattern
      const pattern = route.path
        .replace(/\[([^\]]+)\]/g, "([^/]+)") // Replace [param] with regex capture group
        .replace(/\//g, "\\/"); // Escape forward slashes
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(path);
    }
    return route.path === path;
  });
}

// Helper function to extract params from dynamic route
export function extractParams(
  path: string,
  route: RouteConfig
): Record<string, string> {
  // If the route doesn't contain dynamic parameters, return empty object
  if (!route.path.includes("[")) {
    return {};
  }

  const pattern = route.path
    .replace(/\[([^\]]+)\]/g, "([^/]+)") // Replace [param] with regex capture group
    .replace(/\//g, "\\/"); // Escape forward slashes
  const regex = new RegExp(`^${pattern}$`);
  const matches = path.match(regex);

  if (!matches) {
    return {};
  }

  const params: Record<string, string> = {};
  const paramNames =
    route.path.match(/\[([^\]]+)\]/g)?.map((p) => p.slice(1, -1)) || [];

  paramNames.forEach((name, index) => {
    params[name] = matches[index + 1];
  });

  return params;
}
