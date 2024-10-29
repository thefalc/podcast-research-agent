import { useState } from "react";
import Layout from '../components/Layout';

function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

const PodcastResearchCollectionPage = () => {
  const [urls, setUrls] = useState([{ value: "", isValid: true }]);
  const [context, setContext] = useState("");

  // const urlRegex = /^(https?:\/\/)?((([a-zA-Z0-9_-]+\.)+[a-zA-Z]{2,})|localhost)(:[0-9]{1,5})?(\/[a-zA-Z0-9@:%._\+~#=]*)*(\?[a-zA-Z0-9@:%_\+.~#&//=]*)?(#[a-zA-Z0-9_-]*)?$/;;
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
      urls: urls.map((url) => url.value),
      context,
    };

    const response = await fetch("/api/save-research-inputs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log("Data submitted successfully");
    } else {
      console.error("Error submitting data");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-center mb-4">Submit URLs and Context</h3>
          <form onSubmit={handleSubmit}>
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
            <div className="mb-3">
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Additional context"
                rows="4"
                className="form-control"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100">
              <i className="bi bi-send"></i> Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <Layout title="Create Research Collection">
      <PodcastResearchCollectionPage />
    </Layout>
  );
}