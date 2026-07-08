// src/pages/SettingsPage.tsx
// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Play, Square, CheckCircle, XCircle, Headphones, Settings } from 'lucide-react';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export default function SettingsPage() {
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<DeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('default');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('default');

  const [micLevel, setMicLevel] = useState(0);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [isSpeakerTesting, setIsSpeakerTesting] = useState(false);
  const [speakerResult, setSpeakerResult] = useState<'success' | 'error' | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const testAudioRef = useRef<HTMLAudioElement>(null);

  // Load devices
  useEffect(() => {
    loadDevices();
    loadSavedSettings();
    return () => cleanupMic();
  }, []);

  const loadSavedSettings = () => {
    const saved = localStorage.getItem('audioSettings');
    if (saved) {
      const { mic, speaker } = JSON.parse(saved);
      setSelectedMic(mic || 'default');
      setSelectedSpeaker(speaker || 'default');
    }
  };

  const saveSettings = () => {
    localStorage.setItem('audioSettings', JSON.stringify({
      mic: selectedMic,
      speaker: selectedSpeaker
    }));
    alert('Audio settings saved!');
  };

  const loadDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputs = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || 'Default Microphone' }));

      const outputs = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || 'Default Speaker' }));

      setMics(inputs.length > 0 ? inputs : [{ deviceId: 'default', label: 'Default Microphone' }]);
      setSpeakers(outputs.length > 0 ? outputs : [{ deviceId: 'default', label: 'Default Speaker' }]);

      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      console.error('Device access denied', err);
    }
  };

  const startMicTest = async () => {
    cleanupMic();

    try {
      const constraints = selectedMic === 'default'
        ? { audio: true }
        : { audio: { deviceId: { exact: selectedMic } } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setIsMicTesting(true);
      monitorMicLevel();
    } catch (err) {
      alert('Cannot access microphone. Please allow permission and try again.');
    }
  };

  const stopMicTest = () => {
    cleanupMic();
    setIsMicTesting(false);
    setMicLevel(0);
  };

  const cleanupMic = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const monitorMicLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const draw = () => {
      if (!isMicTesting) return;

      analyserRef.current!.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalized = Math.min(average / 100, 1); // Better scaling
      setMicLevel(normalized);

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const playTestSound = async () => {
    if (!testAudioRef.current) return;

    const audio = testAudioRef.current;
    setSpeakerResult(null);
    setIsSpeakerTesting(true);

    try {
      // Try to route to selected speaker (Chrome/Edge only)
      if (typeof (audio as any).setSinkId === 'function') {
        await (audio as any).setSinkId(selectedSpeaker);
      }

      audio.currentTime = 0;
      await audio.play();

      setTimeout(() => {
        setIsSpeakerTesting(false);
        setSpeakerResult('success');
      }, 2500);
    } catch (err) {
      setIsSpeakerTesting(false);
      setSpeakerResult('error');
    }
  };

  const stopTestSound = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.currentTime = 0;
    }
    setIsSpeakerTesting(false);
    setSpeakerResult(null);
  };

  return (
    <>
      <audio
        ref={testAudioRef}
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        preload="auto"
      />

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
              <h1 className="text-2xl font-semibold flex items-center gap-3">
                <Settings className="w-7 h-7" />
                Audio Settings
              </h1>
              <p className="text-blue-100 mt-1">Configure your microphone and speaker for the best call quality</p>
            </div>

            <div className="p-8 space-y-10">
              {/* Microphone */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Mic className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Microphone</h2>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Microphone</label>
                    <select
                      value={selectedMic}
                      onChange={(e) => setSelectedMic(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    >
                      {mics.map(m => (
                        <option key={m.deviceId} value={m.deviceId}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <button
                      onClick={isMicTesting ? stopMicTest : startMicTest}
                      className={`w-full py-4 px-6 rounded-lg font-medium text-white transition flex items-center justify-center gap-3 ${
                        isMicTesting
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isMicTesting ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      {isMicTesting ? 'Stop Testing' : 'Test Microphone'}
                    </button>
                  </div>

                  {/* Live Waveform + Level */}
                  {isMicTesting && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-3">Speak now — you should see the bars move</p>
                        <div className="flex justify-center items-end gap-1 h-24 px-8">
                          {[...Array(20)].map((_, i) => (
                            <div
                              key={i}
                              className="w-3 bg-blue-600 rounded-full transition-all duration-75"
                              style={{
                                height: `${Math.max(4, micLevel * 100 * (1 - i * 0.03))}%`,
                                opacity: 0.8 + (i * 0.01)
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center text-sm">
                        <span className="text-gray-600">Input Level: </span>
                        <span className="font-semibold text-blue-600">
                          {micLevel > 0.3 ? 'Good' : micLevel > 0.1 ? 'Low' : 'Silent'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Speaker */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Headphones className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Speaker</h2>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Speaker / Headset</label>
                    <select
                      value={selectedSpeaker}
                      onChange={(e) => setSelectedSpeaker(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    >
                      {speakers.map(s => (
                        <option key={s.deviceId} value={s.deviceId}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <button
                      onClick={isSpeakerTesting ? stopTestSound : playTestSound}
                      className={`w-full py-4 px-6 rounded-lg font-medium text-white transition flex items-center justify-center gap-3 ${
                        isSpeakerTesting
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isSpeakerTesting ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      {isSpeakerTesting ? 'Stop Sound' : 'Play Test Sound'}
                    </button>
                  </div>

                  {isSpeakerTesting && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-blue-800 font-medium">Playing test tone...</p>
                      <p className="text-sm text-blue-700 mt-1">You should hear clear music</p>
                    </div>
                  )}

                  {speakerResult && (
                    <div className={`p-4 rounded-lg text-center font-medium ${
                      speakerResult === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {speakerResult === 'success' ? (
                        <>Sound played successfully!</>
                      ) : (
                        <>No sound detected. Try increasing volume or changing device.</>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  onClick={saveSettings}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 text-sm text-gray-500">
            These settings will be remembered for future calls
          </div>
        </div>
      </div>
    </>
  );
}