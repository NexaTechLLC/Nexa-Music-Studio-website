export async function getServerSideProps({ req, res }) {
  const { serveHtmlPage } = await import("../lib/page-server.js");
  return serveHtmlPage(req, res);
}

export default function EmptyPage() {
  return null;
}
