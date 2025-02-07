"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [, setSelectedDeviceId] = useState<string | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean>(false);
  const { toast } = useToast();

  const getStream = useCallback(
    async (deviceId?: string) => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const constraints: MediaStreamConstraints = {
            video: {
              deviceId: deviceId ? { exact: deviceId } : undefined,
              width: { ideal: 2560 },
              height: { ideal: 1440 },
              frameRate: { ideal: 60 },
            },
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);

          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();
          console.log("Camera capabilities:", capabilities);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
          setHasCameraAccess(true);
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
        } else {
          toast({
            title: "Camera Access Failed",
            description: "Could not access camera. Please check permissions.",
            variant: "destructive",
          });
        }
      }
    },
    [toast]
  );

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

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    getStream(deviceId);
  };

  return (
    <div className="min-h-screen p-8 pb-20 flex flex-col items-center gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="font-bold text-5xl">Mirror</div>

      {!hasCameraAccess && (
        <Button onClick={() => getStream()}>Allow Camera Access</Button>
      )}

      {hasCameraAccess && (
        <>
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
          <video
            ref={videoRef}
            className="w-full aspect-video bg-black"
          ></video>
        </>
      )}
    </div>
  );
}
