import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { backend } from '../../core/backend';
import './GalleryPage.scss';

interface ImageData {
  id: string;
  prompt: string;
  engine: string;
  user_id: string;
}

const engines = ["mj", "imagen", "dalle3"]; // List of engines for the select dropdown

const GalleryPage: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [baseUrl, setBaseurl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [engine, setEngine] = useState(searchParams.get('engine') || '');
  const [userId, setUserId] = useState(searchParams.get('user_id') || '');
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [userIds, setUserIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserIds = async () => {
      try {
        const response = await backend.current?.getGalleryUserIds();
        if (response?.success) {
          setUserIds(response.data);
        }
      } catch (error) {
        console.error('Error fetching user IDs:', error);
      }
    };

    fetchUserIds();
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const response = await backend.current?.getGalleryImages({
          page,
          engine,
          user_id: userId,
          prompt,
        });
        if (response) {
          setImages(response.data.images);
          setBaseurl(response.data.baseUrl);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [page, engine, userId, prompt]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSearchParams({ page: newPage.toString(), engine, user_id: userId, prompt });
  };

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setPage(1); // Reset page to 1 when a filter changes
  };

  return (
    <div className={`gallery-page ${selectedImage ? 'modal-open' : ''}`}>
      <h1>Generated Images Gallery</h1>
      <div className="filters">
        <label>
          Engine:
          <select value={engine} onChange={(e) => handleFilterChange(setEngine, e.target.value)}>
            <option value="">All</option>
            {engines.map((eng) => (
              <option key={eng} value={eng}>
                {eng}
              </option>
            ))}
          </select>
        </label>
        <label>
          User ID:
          <select value={userId} onChange={(e) => handleFilterChange(setUserId, e.target.value)}>
            <option value="">All</option>
            {userIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </label>
        <label>
          Prompt:
          <input value={prompt} onChange={(e) => handleFilterChange(setPrompt, e.target.value)} />
        </label>
        <button onClick={() => handlePageChange(1)}>Search</button>
      </div>
      {loading || !images ? (
        <p>Loading...</p>
      ) : (
        <div className="image-grid">
          {images.map((image) => (
            <div key={image.id} className="image-item" onClick={() => setSelectedImage(image)}>
              <img src={baseUrl + image.id + "_min.png"} alt={image.prompt} />
              <div className="image-prompt">{image.prompt.split('\n')[0]}</div> {/* Show only the first line of the prompt on hover */}
            </div>
          ))}
        </div>
      )}
      <div className="pagination">
        <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
          Previous
        </button>
        <button onClick={() => handlePageChange(page + 1)}>Next</button>
      </div>

      {/* Modal for displaying the selected image */}
      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content">
            <img src={baseUrl + selectedImage.id + ".png"} alt="Selected" className="modal-image" />
            <div className="modal-details">
              <p><strong>Prompt:</strong> {selectedImage.prompt.split('\n')[0]}</p> {/* Show only the first line */}
              <p><strong>Engine:</strong> {selectedImage.engine}</p>
              <p><strong>User ID:</strong> {selectedImage.user_id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
