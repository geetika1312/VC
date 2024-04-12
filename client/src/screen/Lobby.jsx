import React, { useState, useCallback, useEffect } from "react";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faUser } from '@fortawesome/free-solid-svg-icons';

import sticker from '../images/sticker.png'; // Import your lobby image

import { useNavigate } from "react-router-dom";
import { useSocket } from '../context/SocketProvider';

const LobbyScreen = () => {
    const [email, setEmail] = useState("");
    const [room, setRoom] = useState("");

    const socket = useSocket();
    const navigate = useNavigate();

    const handleSubmitForm = useCallback(
        (e) => {
            e.preventDefault();
            socket.emit('room:join', { email, room });
        },
        [email, room, socket]
    );

    const handleJoinRoom = useCallback((data) => {
        const { room } = data;
        navigate(`/room/${room}`);
    }, [navigate]);

    useEffect(() => {
        socket.on("room:join", handleJoinRoom);
        return () => {
            socket.off('room:join', handleJoinRoom)
        }
    }, [socket, handleJoinRoom]);

    return (
        <div className="lobby-container">
            <img src={sticker} alt="Sticker" className="sticker" />
            <h1 className="lobby-title animated">Welcome to the Lobby</h1>
            <form onSubmit={handleSubmitForm} className="lobby-form">
                <label htmlFor="email" className="lobby-label">
                    <FontAwesomeIcon icon={faEnvelope} /> Email ID
                </label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lobby-input"
                />
                <br />
                <label htmlFor="room" className="lobby-label">
                    <FontAwesomeIcon icon={faUser} /> Room Number
                </label>
                <input
                    type="text"
                    id="room"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="lobby-input"
                />
                <br />
                <button className="lobby-button">Join</button>
            </form>
        </div>
    );
};

export default LobbyScreen;
