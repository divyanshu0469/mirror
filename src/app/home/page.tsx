"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, FlipHorizontal2, RotateCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Home = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [, setSelectedDeviceId] = useState<string | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Add fullscreen change event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const drawVideo = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Set canvas size based on rotation
        if (rotation % 180 === 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        } else {
          canvas.width = video.videoHeight;
          canvas.height = video.videoWidth;
        }

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save the current context state
        ctx.save();

        // Move to center of canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // Apply rotation
        ctx.rotate((rotation * Math.PI) / 180);

        // Apply horizontal flip if needed
        if (isFlipped) {
          ctx.scale(-1, 1);
        }

        // Draw the video
        ctx.drawImage(
          video,
          -video.videoWidth / 2,
          -video.videoHeight / 2,
          video.videoWidth,
          video.videoHeight
        );

        // Restore the context state
        ctx.restore();
      }

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(drawVideo);
    }
  }, [isFlipped, rotation]);

  const getStream = useCallback(
    async (deviceId?: string) => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // First get the capabilities of the device
          const stream = await navigator.mediaDevices.getUserMedia({
            video: deviceId ? { deviceId: { exact: deviceId } } : true,
          });

          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();

          // Get maximum supported values
          const maxWidth = capabilities.width?.max || 3840; // Default to 4K if not specified
          const maxHeight = capabilities.height?.max || 2160;
          const maxFrameRate = capabilities.frameRate?.max || 60;

          // Stop the initial stream
          stream.getTracks().forEach((track) => track.stop());

          // Request new stream with maximum capabilities
          const constraints: MediaStreamConstraints = {
            video: {
              deviceId: deviceId ? { exact: deviceId } : undefined,
              width: { ideal: maxWidth },
              height: { ideal: maxHeight },
              frameRate: { ideal: maxFrameRate },
              // Additional advanced constraints for quality
              advanced: [
                {
                  width: { min: maxWidth / 2 },
                  height: { min: maxHeight / 2 },
                  frameRate: { min: Math.min(30, maxFrameRate) }, // Ensure at least 30fps if possible
                },
              ],
            },
          };

          const highQualityStream = await navigator.mediaDevices.getUserMedia(
            constraints
          );
          const highQualityTrack = highQualityStream.getVideoTracks()[0];

          // Log the actual settings being used
          const settings = highQualityTrack.getSettings();
          console.log("Camera settings:", settings);

          if (videoRef.current) {
            videoRef.current.srcObject = highQualityStream;
            videoRef.current.play().then(() => {
              drawVideo();
            });
          }
          setHasCameraAccess(true);

          // Log actual achieved resolution and framerate
          videoRef.current?.addEventListener("loadedmetadata", () => {
            if (videoRef.current) {
              console.log("Actual video dimensions:", {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
              });
            }
          });
        } else {
          console.log("getUserMedia is not supported in this browser");
          toast({
            title: "Browser Not Supported",
            description: "getUserMedia is not supported in this browser.",
            variant: "destructive",
          });
        }
      } catch (err) {
        const error = err as Error;
        console.log({ error });
        if (error.name === "NotFoundError") {
          toast({
            title: "Device Not Found",
            description: "Could not find any camera devices.",
            variant: "destructive",
          });
        } else if (error.name === "OverconstrainedError") {
          // If the requested constraints are too high, retry with lower values
          console.log("Retrying with lower quality...");
          const fallbackConstraints: MediaStreamConstraints = {
            video: {
              deviceId: deviceId ? { exact: deviceId } : undefined,
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            },
          };
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia(
              fallbackConstraints
            );
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              videoRef.current.play().then(() => {
                drawVideo();
              });
            }
            setHasCameraAccess(true);
          } catch (fallbackErr) {
            toast({
              title: "Camera Access Failed",
              description: "Could not access camera with fallback settings.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Camera Access Failed",
            description: "Could not access camera. Please check permissions.",
            variant: "destructive",
          });
        }
      }
    },
    [toast, drawVideo]
  );

  const toggleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const rotateCamera = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          toast({
            title: "Fullscreen Failed",
            description: "Could not enter fullscreen mode.",
            variant: "destructive",
          });
        });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
        getStream(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.log({ err });
      toast({
        title: "Device Enumeration Failed",
        description: "Could not list available devices.",
        variant: "destructive",
      });
    }
  }, [getStream, toast]);

  useEffect(() => {
    if (hasCameraAccess) {
      getDevices();
    }
  }, [hasCameraAccess, getDevices]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    getStream(deviceId);
  };

  return (
    <div className="p-10 flex flex-col items-center gap-4 max-sm:px-0 font-[family-name:var(--font-geist-sans)]">
      {!hasCameraAccess && (
        <Button onClick={() => getStream()}>Allow Camera Access</Button>
      )}
      {hasCameraAccess && (
        <>
          <div className="flex gap-4">
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="h-9 px-4 py-2 rounded-md flex justify-center items-center bg-primary text-primary-foreground shadow hover:bg-primary/90"
                  onClick={toggleFlip}
                >
                  <FlipHorizontal2 className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isFlipped ? "Reset Flip" : "Flip Camera"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="h-9 px-4 py-2 rounded-md flex justify-center items-center bg-primary text-primary-foreground shadow hover:bg-primary/90"
                  onClick={rotateCamera}
                >
                  <RotateCw className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>{"Rotate"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="h-9 px-4 py-2 rounded-md flex justify-center items-center bg-primary text-primary-foreground shadow hover:bg-primary/90"
                  onClick={toggleFullscreen}
                >
                  <Expand className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </TooltipContent>
            </Tooltip>
            <Button onClick={() => getStream()}>Reload</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>Select Camera</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {devices.map((device) => (
                  <DropdownMenuItem
                    key={device.deviceId}
                    onSelect={() => handleDeviceChange(device.deviceId)}
                  >
                    {device.label || `Camera ${device.deviceId}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div
            ref={containerRef}
            className={`relative ${
              isFullscreen ? "w-full h-full" : "w-3/5 aspect-video rounded-xl"
            } bg-black`}
          >
            <video ref={videoRef} className="hidden" />
            <canvas
              ref={canvasRef}
              className={`w-full h-full ${isFullscreen ? "" : "rounded-xl"}`}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
