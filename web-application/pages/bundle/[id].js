import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "../../components/Layout";

const BundleDetailsPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch bundle details by ID
  useEffect(() => {
    if (!id) return; // Wait for `id` to be available

    async function fetchBundle() {
      try {
        const response = await fetch(`/api/bundles/${id}`);
        const data = await response.json();
        setBundle(data);
      } catch (error) {
        console.error("Error fetching bundle details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBundle();
  }, [id]);

  if (loading) return <div className="text-center mt-5">Loading bundle details...</div>;

  if (!bundle) return <div className="text-center mt-5 text-muted">Bundle not found.</div>;

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Research Bundle Details</h1>

      <div className="card shadow-sm p-4">
      <div className="mb-2"><strong>Guest:</strong> {bundle.guestName}</div>
      <div className="mb-2"><strong>Company:</strong> {bundle.company}</div>
        <div className="mb-2"><strong>Topic:</strong> {bundle.topic}</div>
        <div className="mb-2"><strong>Processed:</strong> {bundle.processed ? "Yes" : "No"}</div>
        <div className="mb-2"><strong>Created Date:</strong> {new Date(bundle.created_date).toLocaleString()}</div>
        <div className="mb-2"><strong>Context:</strong> {bundle.context}</div>
        <div className="mb-2"><strong>URLs:</strong>
          <ul className="list-unstyled">
            {bundle.urls.map((url, index) => (
              <li key={index}>
                <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="card shadow-sm p-4 mt-4">
        <div className="mb-2">
          {bundle.researchBriefText ? (
            <div
              dangerouslySetInnerHTML={{ __html: bundle.researchBriefText }}
              className="p-3 border rounded bg-light"
            />
          ) : (
            "Not available"
          )}
        </div>
      </div>

      <button className="btn btn-secondary w-100 mt-4 mb-4" onClick={() => router.push("/")}>
          Back to Main Page
        </button>
    </div>
  );
}

export default function Index() {
  return (
    <Layout title="PodPrep AI | Resarch Bundle Details">
      <BundleDetailsPage />
    </Layout>
  );
}