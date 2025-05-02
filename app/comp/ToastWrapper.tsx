"use client";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastWrapper = () => {
  return <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />;
};

export default ToastWrapper;