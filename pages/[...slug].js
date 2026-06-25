export async function getServerSideProps({ req, res, params }) {
  const { serveHtmlPage } = await import("../lib/page-server.js");
  return serveHtmlPage(req, res, params.slug || []);
}

export default function EmptyPage() {
  return null;
}
