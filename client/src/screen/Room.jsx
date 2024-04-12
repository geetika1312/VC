import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

import waiting from '../images/waiting.png'; // Import your lobby image
/* Add this to your CSS file */

// Replace this line in your RoomPage component
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';



const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  
   // Add CSS classes for animations
   const connectedAnimationClass = remoteSocketId ? "connected-animation" : "";
   const noOneAnimationClass = remoteSocketId === null ? "no-one-animation" : "";

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const toggleTrack = useCallback(
    (type) => {
      if (myStream) {
        const tracks = type === "audio" ? myStream.getAudioTracks() : myStream.getVideoTracks();
        if (tracks.length > 0) {
          tracks.forEach(track => {
            if (track.enabled !== undefined) {
              track.enabled = !track.enabled;
            }
          });
          setMyStream(prevStream => new MediaStream([...prevStream.getTracks(), ...tracks]));
        } else {
          console.warn(`No ${type} tracks available.`);
        }
      } else {
        console.warn("No stream available.");
      }
    },
    [myStream]
  );

  const endCall = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    setMyStream(null);
    setRemoteStream(null);
    setRemoteSocketId(null);
    // Additional cleanup actions if needed
  }, [myStream]);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  return (
    <div className={`room-container ${connectedAnimationClass} ${noOneAnimationClass}`}>
      <div className="room-header">
        <h1>Room Page</h1>
        <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
      </div>
      <div className="room-actions">
        {myStream && <button className="send-stream-button" onClick={sendStreams}>Send Stream</button>}
        {remoteSocketId && 
          <button className="call-button" onClick={handleCallUser}>
            <FontAwesomeIcon icon={faPhone} className="call-icon" /> Call
        </button>}
      </div>
      

      <div className="video-container">
        {remoteSocketId ? (
          <>
            <div className="video-box">
              {myStream && (
                <>
                  <h2>My Stream</h2>
                  <ReactPlayer
                    playing
                    muted
                    height="200px"
                    width="300px"
                    url={myStream}
                  />
                </>
              )}
            </div>
            <div className="video-box">
              {remoteStream && (
                <>
                  <h2>Remote Stream</h2>
                  <ReactPlayer
                    playing
                    muted
                    height="200px"
                    width="300px"
                    url={remoteStream}
                  />
                </>
              )}
            </div>
          </>
        ) : (
          <div className="waiting-box">
             <img src={waiting} alt="Waiting Emoji" className="waiting-icon"></img>
            <p>Waiting for participants...</p>
          </div>
        )}
      </div>
      {myStream && (
          <div className="controls">
            <button className="control-button" onClick={() => toggleTrack("video")}>
              {myStream.getVideoTracks()[0].enabled ? "Turn Off Video" : "Turn On Video"}
            </button>
            <button className="control-button" onClick={() => toggleTrack("audio")}>
              {myStream.getAudioTracks()[0].enabled ? "Mute Audio" : "Unmute Audio"}
            </button>
            <button className="end-call-button" onClick={endCall}>End Call</button>
          </div>
        )}
    </div>
    
  );
};

export default RoomPage;

