// @ts-nocheck

import { useState } from "react";
import api from "../api";


export default function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/register", form);
      setMessage("Registered successfully!");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Error registering");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-md w-80">
      <h2 className="text-xl font-bold mb-4 text-center">Register</h2>
      <input
        type="text"
        name="name"
        placeholder="Full Name"
        className="w-full mb-3 p-2 border rounded"
        value={form.name}
        onChange={handleChange}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        className="w-full mb-3 p-2 border rounded"
        value={form.email}
        onChange={handleChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        className="w-full mb-3 p-2 border rounded"
        value={form.password}
        onChange={handleChange}
      />
      <button className="w-full bg-green-600 text-white p-2 rounded">
        Register
      </button>
      {message && <p className="text-center mt-2 text-sm">{message}</p>}
    </form>
  );
}
