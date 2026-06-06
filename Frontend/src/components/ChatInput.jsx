import { useState, useRef, memo, useEffect } from "react";
import { Smile, Paperclip, Send, Mic, XCircle, Play, Pause } from "lucide-react";
import toast from "react-hot-toast";

const EMOJIS = ["😀", "😂", "😍", "🥰", "😊", "😎", "🤔", "😅", "😭", "😤", "🥳", "😴", "🤗", "😇", "🙄", "😏", "👍", "👎", "👏", "🙌", "❤️", "💔", "✨", "🔥", "💯", "🎉", "🎊", "✅", "❌", "⚠️"];

const ChatInput = ({ onSend, activeContact }) => {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!text.trim() && !attachment && !audioBlob) || !activeContact) return;
    
    onSend(text.trim(), attachment || audioBlob);
    
    setText("");
    setAttachment(null);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      setAudioBlob(null);
    }
    e.target.value = "";
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
        setAudioBlob(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
      setAudioBlob(null);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="p-3 flex flex-col gap-2 flex-shrink-0" style={{ backgroundColor: '#131c21' }}>
      {showEmojiPicker && (
        <div className="flex flex-wrap gap-1 p-2 bg-[#182229] rounded-lg max-w-xs mb-2">
          {EMOJIS.map((emoji) => (
            <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
              className="p-1 hover:bg-[#2a3338] rounded text-lg">{emoji}</button>
          ))}
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center gap-4 px-4 py-2 bg-[#182229] rounded-2xl animate-pulse">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-sm text-white font-medium">Recording: {formatDuration(recordingTime)}</span>
          </div>
          <button type="button" onClick={cancelRecording} className="text-slate-400 hover:text-rose-400">
            <XCircle size={20} />
          </button>
          <button type="button" onClick={stopRecording} 
            className="px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold uppercase tracking-wider">
            Stop
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 rounded-full hover:bg-[#182229] flex-shrink-0">
            <Smile size={24} className="text-gray-400" />
          </button>
          
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-[#182229] flex-shrink-0">
            <Paperclip size={24} className="text-gray-400" />
          </button>
          
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip" />

          <div className="flex-1 relative flex items-center">
            <input type="text" value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              disabled={!!audioBlob}
              className={`w-full px-4 py-2.5 rounded-2xl text-sm text-white bg-[#182229] border-none outline-none ${audioBlob ? 'opacity-50' : ''}`}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} />
            
            {audioBlob && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center px-4 bg-[#182229] rounded-2xl gap-2">
                <Mic size={16} className="text-cyan-400" />
                <span className="text-xs text-slate-300 truncate flex-1">Voice Note Prepared</span>
                <button type="button" onClick={() => setAudioBlob(null)} className="text-slate-500 hover:text-rose-400">
                  <XCircle size={16} />
                </button>
              </div>
            )}

            {attachment && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center px-4 bg-[#182229] rounded-2xl gap-2">
                <Paperclip size={16} className="text-cyan-400" />
                <span className="text-xs text-slate-300 truncate flex-1">{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} className="text-slate-500 hover:text-rose-400">
                  <XCircle size={16} />
                </button>
              </div>
            )}
          </div>

          {(text.trim() || attachment || audioBlob) ? (
            <button type="submit" className="p-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#00a884', color: '#0d1117' }}>
              <Send size={20} />
            </button>
          ) : (
            <button type="button" onClick={startRecording} className="p-2.5 rounded-full flex-shrink-0 hover:bg-[#2a3338]">
              <Mic size={24} className="text-gray-400" />
            </button>
          )}
        </form>
      )}
    </div>
  );
};

export default memo(ChatInput);
