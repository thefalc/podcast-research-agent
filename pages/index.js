import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from '../components/Layout';
import "bootstrap/dist/css/bootstrap.min.css";

const Home = () => {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBundles() {
      try {
        const response = await fetch("/api/bundles");
        const data = await response.json();
        setBundles(data.bundles);
      } catch (error) {
        console.error("Error fetching bundles:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBundles();
  }, []);

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">PodPrep AI</h1>
      <h5 className="text-center text-muted mb-5">
        Create a research bundle for an upcoming podcast interview
      </h5>

      <div className="d-flex justify-content-center">
        <div className="w-100" style={{ maxWidth: "600px" }}>
          <div className="d-flex justify-content-end mb-4">
            <Link href="/create-research-bundle" className="btn btn-primary" passHref>
              + Create New Research Bundle
            </Link>
          </div>

          {loading ? (
            <div className="text-center">Loading bundles...</div>
          ) : bundles.length === 0 ? (
            <div className="text-center text-muted">No research bundles created yet.</div>
          ) : (
            <div className="list-group">
              {bundles.map((bundle) => (
                <Link
                  href={`/bundle/${bundle._id}`}
                  key={bundle._id}
                  passHref
                  className="list-group-item list-group-item-action mb-3 shadow-sm rounded border-0 p-3 d-flex justify-content-between align-items-center"
                >
                  <div className="fw-bold">{bundle.title}</div>
                  <span
                    className={`badge ${
                      bundle.processed ? "bg-success" : "bg-warning text-dark"
                    }`}
                  >
                    {bundle.processed ? "Processed" : "Processing"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function Index() {
  return (
    <Layout title="PodPrep AI">
      <Home />
    </Layout>
  );
}