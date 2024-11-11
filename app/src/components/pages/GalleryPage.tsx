import React, { useEffect, useState, KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { backend } from '../../core/backend';
import { Page } from '../page';
import { useAppContext } from '../../core/context';
import './GalleryPage.scss';

interface ImageData {
  id: string;
  prompt: string;
  engine: string;
  user_id: string;
  hidden?: boolean;
}

const engines = ["mj", "imagen", "dalle3"]; // List of engines for the select dropdown

const GalleryPage: React.FC = () => {
  const context = useAppContext();
  const [images, setImages] = useState<ImageData[]>([]);
  const [baseUrl, setBaseurl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [engine, setEngine] = useState(searchParams.get('engine') || '');
  const [userId, setUserId] = useState(searchParams.get('user_id') || '');
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [promptInput, setPromptInput] = useState(searchParams.get('prompt') || '');
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [hideLoading, setHideLoading] = useState(false);

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

  const handlePromptSubmit = () => {
    setPrompt(promptInput);
    setPage(1);
    setSearchParams({ page: '1', engine, user_id: userId, prompt: promptInput });
  };

  const handlePromptKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePromptSubmit();
    }
  };

  const handleHideImage = async (hide: boolean) => {
    if (!selectedImage || hideLoading) return;

    setHideLoading(true);
    try {
      await backend.current?.hideGalleryImage(selectedImage.id, hide);
      // Update the selected image and the image in the grid
      const updatedImage = { ...selectedImage, hidden: hide };
      setSelectedImage(updatedImage);
      setImages(images.map(img => 
        img.id === selectedImage.id ? updatedImage : img
      ));
    } catch (error) {
      console.error('Error updating image visibility:', error);
    } finally {
      setHideLoading(false);
    }
  };

  return (
    <Page id="gallery" isGallery={true}>
      <div className={`gallery-page ${selectedImage ? 'modal-open' : ''}`}>
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
            <input 
              value={promptInput} 
              onChange={(e) => setPromptInput(e.target.value)}
              onBlur={handlePromptSubmit}
              onKeyDown={handlePromptKeyDown}
              placeholder="Type and press Enter to search"
            />
          </label>
        </div>
        {loading || !images ? (
          <p>Loading...</p>
        ) : (
          <div className="image-grid">
            {images.map((image) => (
              <div key={image.id} className="image-item" onClick={() => setSelectedImage(image)}>
                <img src={baseUrl + image.id + "_min.png"} alt={image.prompt} />
                <div className="image-prompt">{image.prompt.split('\n')[0]}</div>
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

        {selectedImage && (
          <div className="modal" onClick={() => setSelectedImage(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <img src={baseUrl + selectedImage.id + ".png"} alt="Selected" className="modal-image" />
              <div className="modal-details">
                <p><strong>Prompt:</strong> {selectedImage.prompt.split('\n')[0]}</p>
                <p><strong>Engine:</strong> {selectedImage.engine}</p>
                <p><strong>User ID:</strong> {selectedImage.user_id}</p>
                {context.user?.id === selectedImage.user_id && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedImage.hidden}
                      onChange={(e) => handleHideImage(e.target.checked)}
                      disabled={hideLoading}
                    />
                    Hide from gallery
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
};

export default GalleryPage;
