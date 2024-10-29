import { useState } from "react";
import { useRouter } from "next/router";
import Layout from '../components/Layout';

function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

const CreateResearchBundlePage = () => {
  const router = useRouter(); 
  const [title, setTitle] = useState("");
  const [urls, setUrls] = useState([{ value: "", isValid: true }]);
  const [context, setContext] = useState("");

  const urlRegex = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

  const validateUrl = debounce((index, value) => {
    const newUrls = [...urls];
    newUrls[index].isValid = urlRegex.test(value);
    setUrls(newUrls);
  }, 300); // Debounce delay of 300ms

  const handleUrlChange = (index, event) => {
    const newUrls = [...urls];
    newUrls[index].value = event.target.value;
    setUrls(newUrls);
    
    validateUrl(index, event.target.value);
  };

  const addUrlField = () => {
    setUrls([...urls, { value: "", isValid: true }]);
  };

  const removeUrlField = (index) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Check if all URLs are valid before submitting
    const allValid = urls.every((url) => url.isValid && url.value !== "");
    if (!allValid) {
      alert("Please correct invalid URLs before submitting.");
      return;
    }

    const data = {
      title,
      urls: urls.map((url) => url.value),
      context,
    };

    const response = await fetch("/api/create-research-bundle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log("Data submitted successfully");

      router.push("/");
    } else {
      console.error("Error submitting data");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-center mb-4">Create a Research Bundle</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-control"
                id="title"
                placeholder="Enter a title for the research bundle"
                required
              />
            </div>
            <div className="mb-3">
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Context for the episode"
                rows="4"
                className="form-control"
              />
            </div>
            {urls.map((url, index) => (
              <div key={index} className="input-group mb-3">
                <input
                  type="url"
                  value={url.value}
                  onChange={(event) => handleUrlChange(index, event)}
                  className={`form-control ${!url.isValid ? "is-invalid" : ""}`}
                  placeholder={`Enter URL ${index + 1}`}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => removeUrlField(index)}
                  disabled={urls.length === 1}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline-primary w-100 mb-3"
              onClick={addUrlField}
            >
              <i className="bi bi-plus-circle"></i> Add Another URL
            </button>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => router.push("/")}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-send"></i> Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <Layout title="PodPrep AI | Create a Research Bundle">
      <CreateResearchBundlePage />
    </Layout>
  );
}