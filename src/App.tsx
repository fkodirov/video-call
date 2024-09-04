import React, { useEffect, useRef, useState } from 'react';
import Peer, { MediaConnection, DataConnection } from 'peerjs';
import 'bootstrap/dist/css/bootstrap.min.css';

const VideoChatApp: React.FC = () => {
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerIdValue, setRemotePeerIdValue] = useState<string>('');
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentUserVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerInstance = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  useEffect(() => {
    const peer = new Peer();

    peer.on('open', (id: string) => {
      setPeerId(id);
    });

    peer.on('call', async (call: MediaConnection) => {
      setIncomingCall(call); // Сохраняем входящий вызов

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = mediaStream;

        if (currentUserVideoRef.current) {
          currentUserVideoRef.current.srcObject = mediaStream;
          currentUserVideoRef.current.play();
        }

        call.on('stream', (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play();
          }
        });
      } catch (err) {
        console.error('Failed to get local stream', err);
      }
    });

    peer.on('connection', (conn: DataConnection) => {
      connectionRef.current = conn;
      conn.on('data', (data: unknown) => {
        const message = data as string;
        setMessages((prevMessages) => [...prevMessages, message]);
      });
    });

    peerInstance.current = peer;

    return () => {
      peer.destroy();
    };
  }, []);

  const call = async (remotePeerId: string) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = mediaStream;

      if (currentUserVideoRef.current) {
        currentUserVideoRef.current.srcObject = mediaStream;
        currentUserVideoRef.current.play();
      }

      const call = peerInstance.current?.call(remotePeerId, mediaStream);

      call?.on('stream', (remoteStream: MediaStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play();
        }
      });

      const conn = peerInstance.current?.connect(remotePeerId);
      if (conn) {
        connectionRef.current = conn;
        conn.on('data', (data: unknown) => {
          const message = data as string;
          setMessages((prevMessages) => [...prevMessages, message]);
        });
      }

      callRef.current = call ?? null;
    } catch (err) {
      console.error('Failed to get local stream', err);
    }
  };

  const endCall = () => {
    callRef.current?.close();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (currentUserVideoRef.current) {
      currentUserVideoRef.current.srcObject = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    callRef.current = null;
    setIncomingCall(null); // Сброс входящего вызова
  };

  const answerCall = async () => {
    if (incomingCall) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = mediaStream;

        if (currentUserVideoRef.current) {
          currentUserVideoRef.current.srcObject = mediaStream;
          currentUserVideoRef.current.play();
        }

        incomingCall.answer(mediaStream);

        incomingCall.on('stream', (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play();
          }
        });

        callRef.current = incomingCall;
        setIncomingCall(null); // Сброс входящего вызова после ответа
      } catch (err) {
        console.error('Failed to get local stream', err);
      }
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      incomingCall.close();
      setIncomingCall(null); // Сброс входящего вызова после отклонения
    }
  };

  const toggleVideo = () => {
    const videoTrack = mediaStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = mediaStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const sendMessage = () => {
    if (message.trim() && connectionRef.current) {
      connectionRef.current.send(message);
      setMessages((prevMessages) => [...prevMessages, `You: ${message}`]);
      setMessage('');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">Video Chat App</h1>
      <div className="text-center mb-4">
        <h5>Current user ID: <span className="badge bg-primary">{peerId}</span></h5>
        <input
          type="text"
          className="form-control my-2"
          value={remotePeerIdValue}
          onChange={(e) => setRemotePeerIdValue(e.target.value)}
          placeholder="Enter remote peer ID"
        />
        <button className="btn btn-success me-2" onClick={() => call(remotePeerIdValue)}>Call</button>
        <button className="btn btn-danger" onClick={endCall}>End Call</button>
      </div>

      {incomingCall && (
        <div className="text-center mb-4">
          <h4>Incoming Call</h4>
          <button className="btn btn-primary me-2" onClick={answerCall}>Answer</button>
          <button className="btn btn-secondary" onClick={rejectCall}>Reject</button>
        </div>
      )}

      <div className="text-center mb-4">
        <button className="btn btn-warning me-2" onClick={toggleVideo}>
          {isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
        </button>
        <button className="btn btn-warning" onClick={toggleAudio}>
          {isAudioEnabled ? 'Turn Off Audio' : 'Turn On Audio'}
        </button>
      </div>

      <div className="row">
        <div className="col-md-6">
          <video ref={currentUserVideoRef} className="w-100 border" autoPlay playsInline />
        </div>
        <div className="col-md-6">
          <video ref={remoteVideoRef} className="w-100 border" autoPlay playsInline />
        </div>
      </div>

      <div className="chat mt-4">
        <h4>Chat</h4>
        <div className="border p-2 mb-2" style={{ height: '200px', overflowY: 'auto' }}>
          {messages.map((msg, index) => (
            <div key={index}>{msg}</div>
          ))}
        </div>
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message"
          />
          <button className="btn btn-primary" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default VideoChatApp;
