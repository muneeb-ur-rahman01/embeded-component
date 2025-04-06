import React, { useState, useRef, useEffect } from 'react';
import { Settings2, X, Upload, ChevronRight } from 'lucide-react';
import img1 from './assets/image1.jpg'
import img2 from './assets/image2.jpg'
import img3 from './assets/image3.jpg'
import img4 from './assets/image4.jpg'



type Position = {
  activeLayer: number;
  transitionDelay: number;
  backgroundPosition?: { x: number; y: number };
  flipDirection?: 'left' | 'right' | null;
};

type MediaItem = {
  type: 'image' | 'video';
  url: string;
  header?: string;
};

type MediaSlot = {
  a: MediaItem;
  b: MediaItem;
};

function App() {
  const [showControls, setShowControls] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [mediaSlots, setMediaSlots] = useState<MediaSlot[]>([
    {
      a: { type: 'image', url: img1, header: "Are we outsourcing creativity—or igniting it?" },
      b: { type: 'image', url: img1 }
    },
    {
      a: { type: 'image', url: img2, header: "Are we outsourcing creativity—or igniting it?" },
      b: { type: 'image', url: img2 }
    },
    {
      a: { type: 'image', url: img3, header: "Are we outsourcing creativity—or igniting it?" },
      b: { type: 'image', url: img3 }
    },
    {
      a: { type: 'image', url: img4, header: "Are we outsourcing creativity—or igniting it?" },
      b: { type: 'image', url: img4 }
    }
  ]);

  // Locked settings
  const rows = 1;
  const cols = 8;
  const gapSize = 0;
  const cornerRadius = 0;
  const numLayers = 4;
  const floatScale = 1;
  const floatHeight = 2;
  const floatDepth = 16;
  const blurAmount = 0;

  const [positions, setPositions] = useState<Position[]>(
    Array(rows * cols).fill({ activeLayer: 0, transitionDelay: 0, flipDirection: null })
  );

  const fileInputRefs = Array(8).fill(0).map(() => useRef<HTMLInputElement>(null));
  const videoRefs = useRef<(HTMLVideoElement | null)[][]>(
    Array(numLayers).fill(null).map(() => Array(rows * cols).fill(null))
  );
  const fullscreenVideoRefs = useRef<(HTMLVideoElement | null)[]>(Array(numLayers).fill(null));
  const cellRefs = useRef<(HTMLDivElement | null)[]>(Array(rows * cols).fill(null));

  const getOriginalPosition = (index: number) => ({
    x: (index % cols) * (100 / (cols - 1)),
    y: Math.floor(index / cols) * (100 / (rows - 1))
  });

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>, layerIndex: number, slot: 'a' | 'b') => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setMediaSlots(prev => prev.map((item, index) =>
        index === layerIndex ? {
          ...item,
          [slot]: {
            ...item[slot],
            type,
            url
          }
        } : item
      ));
    }
  };

  const handleHeaderChange = (layerIndex: number, slot: 'a' | 'b', value: string) => {
    setMediaSlots(prev => prev.map((item, index) =>
      index === layerIndex ? {
        ...item,
        [slot]: {
          ...item[slot],
          header: value
        }
      } : item
    ));
  };

  useEffect(() => {
    mediaSlots.forEach((slot, layerIndex) => {
      if (slot.a.type === 'video' && fullscreenVideoRefs.current[layerIndex]) {
        const video = fullscreenVideoRefs.current[layerIndex];
        if (video) {
          video.currentTime = 0;
          video.play().catch(error => {
            console.log('Fullscreen video autoplay failed:', error);
          });
        }
      }

      if (slot.b.type === 'video') {
        const videos = videoRefs.current[layerIndex];
        if (videos) {
          const playPromises = videos
            .filter(video => video !== null)
            .map(video => {
              if (video) {
                video.currentTime = 0;
                return video.play();
              }
              return Promise.resolve();
            });

          Promise.all(playPromises).catch(error => {
            console.log('Tiled video autoplay failed:', error);
          });
        }
      }
    });
  }, [mediaSlots]);

  const handleVideoTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>, layerIndex: number, cellIndex: number) => {
    const video = event.currentTarget;
    const videos = videoRefs.current[layerIndex];

    if (videos) {
      videos.forEach((otherVideo, i) => {
        if (otherVideo && i !== cellIndex && Math.abs(otherVideo.currentTime - video.currentTime) > 0.1) {
          otherVideo.currentTime = video.currentTime;
        }
      });
    }
  };

  const handleCascadingFlip = (direction: 'right' | 'left', startPoint: 'right' | 'left') => {
    if (isFlipping) return;
    setIsFlipping(true);
  
    // 1. First slide new media in from left
    setPositions((prev) => {
      const updated = [...prev];
      updated[0] = {
        ...updated[0],
        flipDirection: 'left',
      };
      return updated;
    });
  
    // Wait for slide-in animation to complete
    const slideInDuration = 600;
  
    setTimeout(() => {
      // 2. Then slide current media out to right
      setPositions((prev) => {
        const updated = [...prev];
        updated[0] = {
          ...updated[0],
          flipDirection: 'right',
        };
        return updated;
      });
  
      // Wait for slide-out animation to complete before tile flips
      const slideOutDuration = 600;
  
      setTimeout(() => {
        const cellsByCol: number[][] = Array(cols).fill(0).map(() => []);
  
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const index = r * cols + c;
            cellsByCol[c].push(index);
          }
        }
  
        let sequence: number[] = [];
  
        if (startPoint === 'right') {
          for (let c = 0; c < cols; c++) {
            sequence = [...sequence, ...cellsByCol[c]];
          }
        } else {
          for (let c = cols - 1; c >= 0; c--) {
            sequence = [...sequence, ...cellsByCol[c]];
          }
        }
  
        const totalTiles = sequence.length;
        const totalDuration = 500;
        const delayBetweenTiles = totalTiles <= 1 ? 0 : totalDuration / (totalTiles - 1);
  
        const flipTile = (index: number, delay: number) => {
          setTimeout(() => {
            setPositions(currentPositions => {
              const updatedPositions = [...currentPositions];
              const currentLayer = updatedPositions[index].activeLayer;
              const nextLayer = direction === 'left'
                ? (currentLayer + 1) % numLayers
                : (currentLayer - 1 + numLayers) % numLayers;
  
              updatedPositions[index] = {
                activeLayer: nextLayer,
                transitionDelay: 0,
                backgroundPosition: getOriginalPosition(index),
                flipDirection: 'left',
              };
  
              return updatedPositions;
            });
  
            if (index === sequence[sequence.length - 1]) {
              setTimeout(() => setIsFlipping(false), 600);
            }
          }, delay);
        };
  
        sequence.forEach((index, position) => {
          flipTile(index, position * delayBetweenTiles);
        });
  
      }, slideOutDuration);
    }, slideInDuration);
  };
  

  useEffect(() => {
    document.documentElement.style.setProperty('--float-scale', floatScale.toString());
    document.documentElement.style.setProperty('--float-height', `-${floatHeight}px`);
    document.documentElement.style.setProperty('--float-depth', `${floatDepth}px`);
    document.documentElement.style.setProperty('--blur-amount', `${blurAmount}px`);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden flex md:flex-row flex-col">
      <div className="md:w-1/2 w-full md:h-full h-1/2 bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 z-10 flex flex-col items-start justify-center p-6">
              <h2 className="text-white text-4xl font-bold drop-shadow-lg mb-4 font-space-grotesk">
              {mediaSlots[positions[0]?.activeLayer]?.a.header}
              </h2>
              <div className="flex gap-2">
                <button
                  style={{
                    width: '184.645px',
                    height: '63.828px',
                    top: '605.17px',
                    left: '99px',
                    borderWidth: '1px',
                    padding: '27.35px',
                    gap: '9.12px',
                    backgroundColor: 'white',
                    color: 'black',
                    fontFamily: 'Space Mono, monospace',
                    fontWeight: 400,
                    fontSize: '14px',
                    lineHeight: '100%',
                    letterSpacing: '1.14px',
                    textAlign: 'center',
                  }}
                  className="rounded border border-black"
                  onClick={() => alert('GET TICKETS clicked!')}
                >
                  GET TICKETS
                </button>

                <button
                  onClick={() => handleCascadingFlip('right', 'right')}
                  className="p-5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Flip right"
                  disabled={isFlipping}
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
        {Array(numLayers).fill(0).map((_, layerIndex) => (
          <div
            key={`fullscreen-${layerIndex}`}
            className={`absolute inset-0 ${positions[0]?.activeLayer === layerIndex
              ? positions[0]?.flipDirection === 'right'
                ? 'slide-right-in'
                : positions[0]?.flipDirection === 'left'
                  ? 'slide-left-in'
                  : ''
              : positions[0]?.flipDirection === 'right'
                ? 'slide-left-out'
                : positions[0]?.flipDirection === 'left'
                  ? 'slide-right-out'
                  : 'opacity-0'
              }`}
          >
           
            {mediaSlots[layerIndex]?.a.type === 'video' ? (
              <video
                ref={el => fullscreenVideoRefs.current[layerIndex] = el}
                className="absolute w-full h-full object-cover"
                src={mediaSlots[layerIndex]?.a.url}
                muted
                playsInline
                loop
                autoPlay
              />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url("${mediaSlots[layerIndex]?.a.url}")`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="relative md:w-1/2 w-full md:h-full h-1/2">
        <button
          onClick={() => setShowControls(!showControls)}
          className="fixed top-4 right-4 z-[1000] p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          {showControls ? <X className="w-6 h-6 text-white" /> : <Settings2 className="w-6 h-6 text-white" />}
        </button>

        <div
          className={`fixed right-0 top-0 h-full w-full md:w-80 bg-gray-800 p-6 transform transition-transform duration-300 ease-in-out z-[999] overflow-y-auto ${showControls ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          <h2 className="text-white text-xl font-bold mb-6">Media Controls</h2>

          <div className="space-y-6">
            <div className="space-y-4">
              {Array(numLayers).fill(0).map((_, index) => (
                <div key={index} className="space-y-4 border-b border-gray-700 pb-4">
                  <h4 className="text-white font-medium">Layer {index + 1}</h4>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Fullscreen Header</label>
                    <input
                      type="text"
                      value={mediaSlots[index]?.a.header || ''}
                      onChange={(e) => handleHeaderChange(index, 'a', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white"
                      placeholder="Enter header text..."
                    />
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRefs[index * 2]}
                      onChange={(e) => handleMediaUpload(e, index, 'a')}
                      accept="image/*,video/mp4"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRefs[index * 2].current?.click()}
                      className="w-full p-3 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Fullscreen Media
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Grid Header</label>
                    <input
                      type="text"
                      value={mediaSlots[index]?.b.header || ''}
                      onChange={(e) => handleHeaderChange(index, 'b', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white"
                      placeholder="Enter header text..."
                    />
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRefs[index * 2 + 1]}
                      onChange={(e) => handleMediaUpload(e, index, 'b')}
                      accept="image/*,video/mp4"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRefs[index * 2 + 1].current?.click()}
                      className="w-full p-3 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Grid Media
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {Array(numLayers).fill(0).map((_, layerIndex) => (
          <div
            key={layerIndex}
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              gap: `${gapSize}px`,
              zIndex: layerIndex + 10,
              padding: 0
            }}
          >
            {positions.map((pos, i) => (
              <div
                key={`mask${layerIndex}-${i}`}
                ref={el => cellRefs.current[i] = el}
                className={`relative overflow-hidden [perspective:1000px] ${numLayers === 1 || pos.activeLayer === layerIndex ? 'mask-visible' : 'mask-hidden'
                  }`}
                style={{
                  borderRadius: `${cornerRadius}px`,
                  transitionDelay: `${pos.transitionDelay}ms`
                }}
              >
                {mediaSlots[layerIndex]?.b.type === 'video' ? (
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${pos.activeLayer === layerIndex
                      ? pos.flipDirection === 'right'
                        ? 'flip-right-in'
                        : pos.flipDirection === 'left'
                          ? 'flip-left-in'
                          : ''
                      : pos.flipDirection === 'right'
                        ? 'flip-right-out'
                        : pos.flipDirection === 'left'
                          ? 'flip-left-out'
                          : ''
                      }`}
                  >
                    <video
                      ref={el => {
                        if (videoRefs.current[layerIndex]) {
                          videoRefs.current[layerIndex][i] = el;
                        }
                      }}
                      onTimeUpdate={(e) => handleVideoTimeUpdate(e, layerIndex, i)}
                      style={{
                        width: `${cols * 100}%`, // Ensures the video takes up the entire width of all columns
                        height: `${rows * 100}%`, // Ensures the video takes up the entire height of all rows
                        objectPosition: pos.backgroundPosition
                          ? `${pos.backgroundPosition.x}% ${pos.backgroundPosition.y}%`
                          : `${(i % cols) * (100 / cols)}% ${Math.floor(i / cols) * (100 / rows)}%` // Correct tile position
                      }}
                      className="absolute w-full h-full object-cover"
                      src={mediaSlots[layerIndex]?.b.url}
                      muted
                      playsInline
                      loop
                      autoPlay
                    />
                  </div>
                ) : (
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${pos.activeLayer === layerIndex
                      ? pos.flipDirection === 'right'
                        ? 'flip-right-in'
                        : pos.flipDirection === 'left'
                          ? 'flip-left-in'
                          : ''
                      : pos.flipDirection === 'right'
                        ? 'flip-right-out'
                        : pos.flipDirection === 'left'
                          ? 'flip-left-out'
                          : ''
                      }`}
                    style={{
                      backgroundImage: `url("${mediaSlots[layerIndex]?.b.url}")`,
                      backgroundSize: `${cols * 100}% ${rows * 100}%`,
                      backgroundPosition: `${(i % cols) * (100 / cols)}% ${Math.floor(i / cols) * (100 / rows)}%`,
                      backgroundRepeat: 'no-repeat',
                      border: '1px solid black',

                    }}
                  />

                )}
                <div className="noise-overlay" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;