"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const api_1 = __importDefault(require("../../lib/api"));
const types_1 = require("@unitedlinkgroup/types");
const lucide_react_1 = require("lucide-react");
const framer_motion_1 = require("framer-motion");
const AnimatedAvatar_1 = require("../../components/AnimatedAvatar");
function LoginPage() {
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)('');
    const router = (0, navigation_1.useRouter)();
    const handleLogin = async (e) => {
        var _a, _b, _c, _d, _e;
        e.preventDefault();
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('selectedBusiness');
            const response = await api_1.default.post('/auth/login', { email, password });
            const token = response.data.access_token;
            localStorage.setItem('token', token);
            const role = (() => {
                try {
                    const base64 = String(token || '').split('.')[1] || '';
                    const padded = base64.replace(/-/g, '+').replace(/_/g, '/').padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
                    const payload = JSON.parse(atob(padded));
                    return (payload === null || payload === void 0 ? void 0 : payload.role) || null;
                }
                catch {
                    return null;
                }
            })();
            if (role === types_1.UserRole.SUPER_ADMIN) {
                localStorage.removeItem('selectedBusiness');
                localStorage.removeItem('superadminBusinessContext');
            }
            else {
                const businessObj = response.data.business;
                const businessId = response.data.businessId;
                if (businessObj && businessObj.id) {
                    localStorage.setItem('selectedBusiness', JSON.stringify(businessObj));
                }
                else if (businessId) {
                    localStorage.setItem('selectedBusiness', JSON.stringify({ id: businessId, name: 'Business' }));
                }
            }
            try {
                window.dispatchEvent(new Event('auth:changed'));
            }
            catch { }
            router.push('/dashboard');
        }
        catch (err) {
            if (((_b = err.response) === null || _b === void 0 ? void 0 : _b.status) === 401) {
                const message = (_d = (_c = err.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message;
                if (typeof message === 'string' && message.toLowerCase().includes('bootstrap')) {
                    setError(message);
                }
                else {
                    setError('Invalid credentials');
                }
            }
            else if (err.response) {
                setError(((_e = err.response.data) === null || _e === void 0 ? void 0 : _e.message) || 'Login failed');
            }
            else {
                setError('Unable to connect to server. Please try again later.');
            }
        }
    };
    return (<div className="flex items-center justify-center min-h-screen bg-[#007AFF] relative overflow-hidden">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Clouds / Blobs */}
        <framer_motion_1.motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"/>
        <framer_motion_1.motion.div animate={{ x: [0, -150, 0], y: [0, 100, 0] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"/>
      </div>

      {/* Skyline */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center opacity-20 pointer-events-none z-0">
        <framer_motion_1.motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 1.5, ease: "easeOut" }} className="flex items-end space-x-8 text-white">
           <lucide_react_1.Building2 size={120}/>
           <lucide_react_1.Building2 size={180}/>
           <lucide_react_1.Building2 size={140}/>
           <lucide_react_1.Building2 size={200}/>
           <lucide_react_1.Building2 size={160}/>
        </framer_motion_1.motion.div>
      </div>

      {/* Active Characters */}
      
      {/* Security - Scanning */}
      <AnimatedAvatar_1.AnimatedAvatar role="Security" icon={lucide_react_1.ShieldCheck} color="bg-blue-600" activityIcon={({ className }) => (<framer_motion_1.motion.div className={`absolute inset-0 rounded-full border-2 border-blue-400`} animate={{ scale: [1, 1.5], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 2 }}/>)} seed="SecurityGuard" delay={0.2} position="left-[10%] bottom-[20%]"/>

      {/* Hospitality - Service */}
      <AnimatedAvatar_1.AnimatedAvatar role="Hospitality" icon={lucide_react_1.ConciergeBell} color="bg-orange-500" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute -top-4 right-0" animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}>
                <span className="text-2xl">🛎️</span>
            </framer_motion_1.motion.div>)} seed="HotelStaff" delay={0.4} position="right-[10%] bottom-[25%]"/>

      {/* Care - Health */}
      <AnimatedAvatar_1.AnimatedAvatar role="Care Giver" icon={lucide_react_1.HeartHandshake} color="bg-pink-500" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute -top-6 -right-6" animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                <span className="text-xl">❤️</span>
            </framer_motion_1.motion.div>)} seed="Nurse" delay={0.6} position="left-[22%] bottom-[10%]"/>

      {/* Admin - Working */}
      <AnimatedAvatar_1.AnimatedAvatar role="Admin" icon={lucide_react_1.Briefcase} color="bg-purple-600" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute -left-4 top-1/2" animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <lucide_react_1.Activity size={16} className="text-white"/>
            </framer_motion_1.motion.div>)} seed="Manager" delay={0.8} position="right-[22%] bottom-[15%]"/>


      {/* Main Login Card */}
      <framer_motion_1.motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full max-w-md bg-blue-500/80 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-blue-400/50 z-30">
        {/* Browser Header */}
        <div className="bg-blue-600/50 px-4 py-3 flex items-center space-x-2 border-b border-blue-400/30">
          <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
        </div>

        {/* Login Content */}
        <div className="p-8 pt-6">
          <div className="flex justify-center mb-6">
             <framer_motion_1.motion.div animate={{ boxShadow: ["0px 0px 0px rgba(255,255,255,0)", "0px 0px 20px rgba(255,255,255,0.5)", "0px 0px 0px rgba(255,255,255,0)"] }} transition={{ repeat: Infinity, duration: 3 }} className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center border-4 border-blue-300/30">
                <lucide_react_1.User size={40} className="text-white"/>
             </framer_motion_1.motion.div>
          </div>

          {error && (<framer_motion_1.motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-100 bg-red-500/20 p-3 rounded text-center text-sm mb-4 border border-red-500/30 space-y-2">
              <div>{error}</div>
              {error.toLowerCase().includes('bootstrap') && (<div>
                  <link_1.default href="/register" className="font-semibold text-white underline underline-offset-4">
                    Create the first admin account
                  </link_1.default>
                </div>)}
            </framer_motion_1.motion.div>)}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <framer_motion_1.motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email Address" className="w-full px-4 py-3 bg-blue-900/30 border border-blue-300/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-blue-900/50 transition-all backdrop-blur-sm"/>
            </framer_motion_1.motion.div>
            <framer_motion_1.motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" className="w-full px-4 py-3 bg-blue-900/30 border border-blue-300/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-blue-900/50 transition-all backdrop-blur-sm"/>
            </framer_motion_1.motion.div>
            
            <framer_motion_1.motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} type="submit" className="w-full px-4 py-3 mt-4 text-white font-bold bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-white/50">
              CONTINUE
            </framer_motion_1.motion.button>
          </form>
          
          <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 text-center space-y-4">
             <link_1.default href="/vendor/login" className="inline-flex items-center gap-2 rounded-full border border-blue-200/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors">
               <lucide_react_1.Store size={16}/>
               Vendor Portal Login
             </link_1.default>
             <p className="text-blue-100/60 text-xs uppercase tracking-widest">Protected System • Authorized Access Only</p>
          </framer_motion_1.motion.div>
        </div>
      </framer_motion_1.motion.div>
    </div>);
}
