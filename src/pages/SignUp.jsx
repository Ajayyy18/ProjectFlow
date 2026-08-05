import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';

const SignUp = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate all required fields
      if (!fullName || !email || !password || !rollNumber || !branch) {
        throw new Error('Please fill in all fields');
      }

      // Validate branch
      const validBranches = ['CSM', 'CSE', 'CSC', 'CSD', 'MECH', 'CIVIL', 'EEE', 'IT', 'CSIT'];
      if (!validBranches.includes(branch)) {
        throw new Error('Invalid branch selected');
      }

      // Validate roll number format (you can adjust this regex as needed)
      const rollNumberRegex = /^[A-Z0-9]+$/;
      if (!rollNumberRegex.test(rollNumber)) {
        throw new Error('Invalid roll number format');
      }

      console.log('Signing up with metadata:', {
        full_name: fullName,
        roll_number: rollNumber,
        branch: branch
      });

      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            roll_number: rollNumber,
            branch: branch
          },
          emailRedirectTo: window.location.origin
        }
      });

      console.log('Sign up response:', signUpData);

      if (signUpError) {
        throw signUpError;
      }

      if (!signUpData?.user?.id) {
        throw new Error('Signup failed - no user ID received');
      }

      // Store signup data in localStorage
      localStorage.setItem('pendingSignup', JSON.stringify({
        id: signUpData.user.id,
        full_name: fullName,
        roll_number: rollNumber,
        branch: branch
      }));

      // Show success message
      alert('Account created successfully! Please check your email to confirm your registration.');
      
      // Navigate to login
      navigate('/');
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <BackButton />
      <div className="pt-16">
      <div className="flex min-h-screen">
        {/* Left side - Signup Form */}
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
                Create your account
              </h1>
              <p className="text-gray-500">Join <span className="font-semibold text-blue-600">ProjectFlow</span> as a student</p>
            </div>

            <form className="space-y-4 md:space-y-6" onSubmit={handleSignUp}>
              <div>
                <label htmlFor="fullName" className="block mb-2 text-sm font-medium text-gray-900">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  className="bg-white/50 border border-gray-200 text-gray-900 sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-3 transition-all duration-200 placeholder:text-gray-400"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  className="bg-white/50 border border-gray-200 text-gray-900 sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-3 transition-all duration-200 placeholder:text-gray-400"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="bg-white/50 border border-gray-200 text-gray-900 sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-3 transition-all duration-200 placeholder:text-gray-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="rollNumber" className="block mb-2 text-sm font-medium text-gray-900">
                  Roll Number
                </label>
                <input
                  type="text"
                  id="rollNumber"
                  className="bg-white/50 border border-gray-200 text-gray-900 sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-3 transition-all duration-200 placeholder:text-gray-400"
                  placeholder="Enter your roll number"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="branch" className="block mb-2 text-sm font-medium text-gray-900">
                  Branch
                </label>
                <select
                  id="branch"
                  className="bg-white/50 border border-gray-200 text-gray-900 sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-3 transition-all duration-200 placeholder:text-gray-400"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  required
                >
                  <option value="">Select Branch</option>
                  <option value="CSM">CSM</option>
                  <option value="CSE">CSE</option>
                  <option value="CSC">CSC</option>
                  <option value="CSD">CSD</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                  <option value="EEE">EEE</option>
                  <option value="IT">IT</option>
                  <option value="CSIT">CSIT</option>
                </select>
              </div>

              {error && (
                <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-xl text-sm px-5 py-3.5 text-center transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="inline w-4 h-4 mr-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                      <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              <p className="text-sm font-light text-gray-500">
                Already have an account?{' '}
                <Link to="/" className="font-medium text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

        {/* Right side - Project Info */}
        <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-blue-600 to-blue-800 flex-col items-center justify-center px-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://cdn.pixabay.com/photo/2016/11/19/14/00/code-1839406_1280.jpg')] opacity-10 bg-cover bg-center"></div>
          <div className="relative z-10 text-white max-w-2xl text-center">
            <h1 className="text-4xl font-bold mb-6">Join ProjectFlow Today</h1>
            <p className="text-xl mb-8 text-blue-100">Empower Your Academic Journey</p>
            
            <div className="grid grid-cols-1 gap-8 mb-12 max-w-lg mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left transform transition-all duration-300 hover:scale-105">
                <h3 className="text-lg font-semibold mb-4">🎓 For Students</h3>
                <ul className="space-y-3 text-blue-100">
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Track your project progress effectively
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Collaborate with team members seamlessly
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Submit and manage assignments easily
                  </li>
                </ul>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left transform transition-all duration-300 hover:scale-105">
                <h3 className="text-lg font-semibold mb-4">💻 Why Choose Us?</h3>
                <ul className="space-y-3 text-blue-100">
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    User-friendly interface
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Real-time collaboration tools
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Comprehensive project analytics
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-800 to-transparent"></div>
        </div>
      </div>

        {/* About Project Section */}
        <section id="about" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">About ProjectFlow</h2>
            <div className="prose lg:prose-lg mx-auto">
              <p className="text-gray-600 text-center">
                ProjectFlow is a comprehensive project management system designed specifically for educational institutions.
                It streamlines the process of managing student projects, facilitating collaboration between students and faculty,
                and providing real-time tracking of project progress.
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

export default SignUp;
