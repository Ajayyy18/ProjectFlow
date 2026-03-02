import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      setLoadingMessage('Authenticating...');
      
      setLoadingMessage('Authenticating...');
      
      // Set a timeout for the auth request with a longer duration
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Server not responding. Please check your connection.')), 20000)
      );

      let result;
      try {
        result = await Promise.race([loginPromise, timeoutPromise]);
      } catch (error) {
        if (error.message.includes('Server not responding')) {
          throw new Error('Unable to connect to the server. Please try again.');
        }
        throw error;
      }

      const { data, error } = result;
      
      if (error) {
        console.error('Auth error:', error.message);
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please confirm your email address before logging in.');
        } else if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Too many attempts. Please wait a moment.');
        } else if (error.message.includes('network')) {
          throw new Error('Network error. Check your connection.');
        }
        throw new Error('Login failed. Please try again.');
      }

      if (!data?.user) {
        throw new Error('Login failed. Please try again.');
      }

      console.log('Successfully signed in user:', data.user.id);
      
      // Get user's profile with retries
      let profile = null;
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 800; // milliseconds

      while (retryCount < maxRetries) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!profileError && profileData) {
          profile = profileData;
          break;
        }

        // If profile doesn't exist and we have pending signup data, create it manually
        if (profileError.code === 'PGRST116' && retryCount === maxRetries - 1) {
          const pendingSignup = localStorage.getItem('pendingSignup');
          if (pendingSignup) {
            const signupData = JSON.parse(pendingSignup);
            if (signupData.id === data.user.id) {
              const { error: insertError } = await supabase
                .from('profiles')
                .insert([
                  {
                    id: data.user.id,
                    full_name: signupData.full_name,
                    role: 'student',
                    roll_number: signupData.roll_number,
                    branch: signupData.branch
                  }
                ]);
              
              if (insertError) {
                console.error('Error creating profile:', insertError);
                throw new Error('Failed to create user profile. Please try again.');
              }

              const { data: newProfile, error: newProfileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

              if (newProfileError) throw newProfileError;
              profile = newProfile;
              localStorage.removeItem('pendingSignup');
              break;
            }
          }
          throw new Error('No signup data found. Please register first.');
        }

        retryCount++;
        setLoadingMessage(`Retrying profile fetch (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      if (!profile) {
        throw new Error('Unable to fetch or create user profile after multiple attempts');
      }

      console.log('Logged in as:', profile.full_name, 'with role:', profile.role);

      // Redirect based on role
      if (profile.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }

    } catch (error) {
      console.error('Login error:', {
        message: error.message,
        error: error,
        stack: error.stack
      });
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <BackButton />
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full mx-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <p className="text-gray-700 font-medium text-lg">{loadingMessage}</p>
            <p className="text-gray-500 text-sm text-center">Please wait while we verify your credentials</p>
          </div>
        </div>
      )}
      <div className="pt-16">
      <div className="flex min-h-screen">
        {/* Left side - Project Info */}
        <div className="hidden lg:flex lg:w-[50%] bg-gradient-to-br from-gray-50 to-gray-100 flex-col items-center justify-center px-8 relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-[url('https://cdn.pixabay.com/photo/2016/11/19/14/00/code-1839406_1280.jpg')] opacity-5 bg-cover bg-center"></div>
          <div className="relative z-10 max-w-lg text-center p-8">
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">Welcome to ProjectFlow</h1>
            <p className="text-lg mb-8 text-gray-600">Your Complete Project Management Solution</p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-left bg-white p-5 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                <h3 className="text-base font-semibold mb-3 text-gray-800 flex items-center">
                  <span className="text-xl mr-2">✨</span> Features
                </h3>
                <ul className="space-y-2.5 text-sm text-gray-600">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Task Management
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Team Collaboration
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Progress Tracking
                  </li>
                </ul>
              </div>
              <div className="text-left bg-white p-5 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                <h3 className="text-base font-semibold mb-3 text-gray-800 flex items-center">
                  <span className="text-xl mr-2">🚀</span> Benefits
                </h3>
                <ul className="space-y-2.5 text-sm text-gray-600">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    High Productivity
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Real-time Updates
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Easy Communication
                  </li>
                </ul>
              </div>
            </div>
            <div className="inline-flex items-center justify-center space-x-2 bg-gray-50 px-6 py-3 rounded-xl border border-gray-200">
              <span className="text-sm font-medium text-gray-600">Trusted by 1000+ Educational Institutions</span>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center px-6 py-8 lg:py-0 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center mb-8 space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center transform transition-transform hover:scale-105">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">ProjectFlow</span>
        </div>
        <div className="w-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-100 md:mt-0 sm:max-w-md xl:p-0 transform transition-all duration-300 hover:shadow-xl">
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold leading-tight tracking-tight bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent md:text-3xl">
                Welcome Back
              </h1>
              <p className="text-gray-500">Sign in to continue to your account</p>
            </div>
            <form className="space-y-4 md:space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/50 border border-gray-200 text-gray-900 sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-3 transition-all duration-200 placeholder:text-gray-400"
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/50 border border-gray-200 text-gray-900 sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-3 transition-all duration-200 placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-xl text-sm px-5 py-3.5 text-center transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <p className="text-sm font-light text-gray-500">
                Don't have an account yet?{' '}
                <Link to="/signup" className="font-medium text-blue-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
      </div>

        {/* About Project Section */}
        <section id="about" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">About ProjectFlow</h2>
            <div className="prose lg:prose-lg mx-auto">
              <p className="text-gray-600 text-center">
              ProjectFlow is an efficient and user-friendly project and team management platform designed to streamline collaboration, task assignment, and performance tracking in academic or organizational environments. The system features two primary roles: Admin and Student. Admins have the ability to register or invite students, create project groups by assigning students to specific teams, assign tasks with deadlines and designated roles, and access real-time analytics to monitor team performance through metrics such as task completion rates, on-time submission percentages, and overall productivity scores. On the other hand, students can log in to view their assigned project, group details, team members, team leader, and tasks along with their status and deadlines. The platform also supports in-team chat functionality, allowing seamless communication among members. Built using React.js and Tailwind CSS on the frontend, with Supabase handling backend services such as authentication, database storage, and real-time features, ProjectFlow provides a responsive and scalable solution for managing collaborative projects efficiently.

              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Project Management</h3>
                <p className="text-gray-600">Efficiently manage and track multiple projects with intuitive tools and interfaces.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Team Collaboration</h3>
                <p className="text-gray-600">Foster seamless collaboration between team members with real-time updates.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Progress Tracking</h3>
                <p className="text-gray-600">Monitor project progress with detailed analytics and reporting tools.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">Contact Us</h2>
            <div className="max-w-lg mx-auto">
              <div className="text-center space-y-4">
                <p className="text-gray-600">Have questions about ProjectFlow? We're here to help!</p>
                <p className="text-gray-600">Email: support@projectflow.com</p>
                <p className="text-gray-600">Phone: (555) 123-4567</p>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Login;
