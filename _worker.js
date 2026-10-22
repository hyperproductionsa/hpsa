export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const legacyRelease = url.pathname.match(/^\/releases\/hyp(\d{3})\/?$/i);

    if (legacyRelease) {
      url.pathname = `/releases/HYP${legacyRelease[1]}.html`;
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  }
};
