"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AddBusinessPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const api_1 = __importDefault(require("../../../lib/api"));
const lucide_react_1 = require("lucide-react");
const react_phone_number_input_1 = __importDefault(require("react-phone-number-input"));
require("react-phone-number-input/style.css");
const countries_1 = require("../../../lib/countries");
const AnimatedAvatar_1 = require("../../../components/AnimatedAvatar");
const framer_motion_1 = require("framer-motion");
const sonner_1 = require("sonner");
// Industry Mappings
const INDUSTRY_OPTIONS = {
    'Retail & Hospitality': [
        'Cafe / Coffee Shop',
        'Restaurant / Bar',
        'Hotel / Motel',
        'Retail Store',
        'Fast Food',
        'Events / Catering'
    ],
    'Fashion': [
        'Clothing Brand',
        'Fashion Retail',
        'Textile Manufacturing',
        'Modeling Agency',
        'Fashion Design',
        'Accessories',
        'Footwear',
        'Jewelry',
        'Stylist / Image Consulting'
    ],
    'Services': [
        'Cleaning Services',
        'Security Services',
        'Consulting',
        'IT / Technology',
        'Legal Services',
        'Marketing / Advertising',
        'Salon / Beauty'
    ],
    'Healthcare': [
        'Hospital',
        'Medical Clinic',
        'Dental Practice',
        'Pharmacy',
        'Aged Care',
        'Disability Support',
        'Veterinary'
    ],
    'Charity': [
        'Non-Profit Organization',
        'Community Group',
        'Religious Organization',
        'Environmental Group'
    ],
    'Real Estate & Property': [
        'Property Management',
        'Real Estate Agency',
        'Strata Management',
        'Student Housing',
        'Commercial Property'
    ],
    'Other': [
        'Construction / Trades',
        'Manufacturing',
        'Logistics / Transport',
        'Education / Training',
        'Government',
        'Agriculture'
    ]
};
const business_context_1 = require("../../../context/business-context");
// Motivational Quotes
const MOTIVATIONAL_QUOTES = [
    "Success is not final; failure is not fatal: It is the courage to continue that counts. – Winston Churchill",
    "The only way to do great work is to love what you do. – Steve Jobs",
    "Business opportunities are like buses, there’s always another one coming. – Richard Branson",
    "Do not be embarrassed by your failures, learn from them and start again. – Richard Branson",
    "Success usually comes to those who are too busy to be looking for it. – Henry David Thoreau",
    "The secret of change is to focus all of your energy, not on fighting the old, but on building the new. – Socrates",
    "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
    "Your most unhappy customers are your greatest source of learning. – Bill Gates",
    "The way to get started is to quit talking and begin doing. – Walt Disney",
    "There are no secrets to success. It is the result of preparation, hard work, and learning from failure. – Colin Powell"
];
function AddBusinessPage() {
    var _a;
    const router = (0, navigation_1.useRouter)();
    const { refreshBusinesses } = (0, business_context_1.useBusiness)();
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [progress, setProgress] = (0, react_1.useState)(0);
    const [currentQuote, setCurrentQuote] = (0, react_1.useState)('');
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        mobile: '',
        country: '',
        businessType: '',
        industry: '',
        employeeCount: ''
    });
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handlePhoneChange = (value) => {
        setFormData(prev => ({ ...prev, mobile: value || '' }));
    };
    const handleCountryChange = (country) => {
        if (country) {
            setFormData(prev => {
                // Basic lookup since we might not have the full helper available in this context easily without importing
                // But we should try to be consistent. Let's assume we can use the map or just rely on backend?
                // Actually, backend sets defaults, but frontend state needs it if we display it.
                // For now, just set country.
                return { ...prev, country: country };
            });
        }
    };
    const handleTypeSelect = (type) => {
        setFormData(prev => ({
            ...prev,
            businessType: type,
            industry: '' // Reset industry when type changes
        }));
    };
    const handleEmployeeCountSelect = (count) => {
        setFormData(prev => ({ ...prev, employeeCount: count }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Start progress animation
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
            currentProgress += 1;
            if (currentProgress > 100) {
                clearInterval(progressInterval);
            }
            else {
                setProgress(currentProgress);
            }
        }, 300); // 300ms * 100 = 30000ms = 30s
        // Start quotes ticker
        let quoteIndex = 0;
        setCurrentQuote(MOTIVATIONAL_QUOTES[0]);
        const quotesInterval = setInterval(() => {
            quoteIndex = (quoteIndex + 1) % MOTIVATIONAL_QUOTES.length;
            setCurrentQuote(MOTIVATIONAL_QUOTES[quoteIndex]);
        }, 5000); // Change quote every 5s
        try {
            // Create business (this might be faster than 30s, so we wait)
            await api_1.default.post('/businesses', formData);
            // Refresh businesses context so it appears immediately
            await refreshBusinesses();
            // Wait for the animation to finish if it hasn't already
            await new Promise(resolve => setTimeout(resolve, 30000));
            sonner_1.toast.success('Business created successfully');
            router.push('/dashboard/settings');
        }
        catch (error) {
            console.error('Failed to create business', error);
            sonner_1.toast.error('Failed to create business');
            setLoading(false);
            clearInterval(progressInterval);
            clearInterval(quotesInterval);
        }
    };
    if (loading) {
        return (<div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-slate-900 px-4">
        <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          {/* United Link Logo Animation */}
          <div className="mb-8 flex justify-center">
            <framer_motion_1.motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <lucide_react_1.Shield className="w-10 h-10 text-indigo-600 dark:text-indigo-400"/>
            </framer_motion_1.motion.div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Hang on while we set up your new business
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            This will only take a moment...
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 mb-2 overflow-hidden">
            <framer_motion_1.motion.div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }} transition={{ duration: 0.1 }}/>
          </div>
          <div className="flex justify-end text-xs text-gray-400 mb-12">
            {progress}%
          </div>

          {/* Quotes Ticker Card */}
          <framer_motion_1.motion.div key={currentQuote} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-center space-x-2 mb-3">
                <span className="relative flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                 </span>
                 <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Daily Inspiration</span>
            </div>
            <p className="text-lg font-medium text-slate-800 dark:text-slate-200 italic">
              &quot;{currentQuote}&quot;
            </p>
          </framer_motion_1.motion.div>
        </framer_motion_1.motion.div>
      </div>);
    }
    return (<div className="flex h-screen overflow-hidden bg-white dark:bg-slate-900">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 transition-colors">
            <lucide_react_1.ArrowLeft className="w-4 h-4 mr-1"/>
            Back
          </button>
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Tell us a bit about your business</h1>
          <p className="text-gray-600 dark:text-slate-400 mb-8">Enjoy complete personalized experience for your business</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div className="col-span-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  What is your business name?
                </label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Please input" required className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"/>
              </div>

              {/* Mobile Number */}
              <div className="col-span-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  What is your mobile number?
                </label>
                <div className="phone-input-container">
                   <react_phone_number_input_1.default placeholder="Enter phone number" value={formData.mobile} onChange={handlePhoneChange} onCountryChange={handleCountryChange} defaultCountry="US" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:border-slate-600 dark:text-white"/>
                </div>
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Country
              </label>
              <select name="country" value={formData.country} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white">
                <option value="">Select</option>
                {countries_1.countries.map((c) => (<option key={c.code} value={c.code}>{c.name}</option>))}
              </select>
            </div>

            {/* Business Type Grid */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                What best describes your business?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
            { id: 'Retail & Hospitality', icon: lucide_react_1.ShoppingBag, label: 'Retail & Hospitality' },
            { id: 'Fashion', icon: lucide_react_1.Shirt, label: 'Fashion' },
            { id: 'Services', icon: lucide_react_1.Monitor, label: 'Services' },
            { id: 'Healthcare', icon: lucide_react_1.Activity, label: 'Healthcare' },
            { id: 'Charity', icon: lucide_react_1.Heart, label: 'Charity' },
        ].map((type) => (<div key={type.id} onClick={() => handleTypeSelect(type.id)} className={`cursor-pointer p-4 rounded-lg border flex flex-col items-center justify-center text-center transition-all h-32 ${formData.businessType === type.id
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${formData.businessType === type.id ? 'bg-white text-teal-600' : 'bg-orange-50 text-orange-500'}`}>
                        <type.icon className="w-5 h-5"/>
                    </div>
                    <span className={`text-xs font-bold ${formData.businessType === type.id ? 'text-teal-700' : 'text-slate-700 dark:text-slate-300'}`}>{type.label}</span>
                  </div>))}
                 <div onClick={() => handleTypeSelect('Other')} className={`cursor-pointer p-4 rounded-lg border flex flex-col items-center justify-center text-center transition-all h-32 ${formData.businessType === 'Other'
            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${formData.businessType === 'Other' ? 'bg-white text-teal-600' : 'bg-orange-50 text-orange-500'}`}>
                        <lucide_react_1.Store className="w-5 h-5"/>
                    </div>
                    <span className={`text-xs font-bold ${formData.businessType === 'Other' ? 'text-teal-700' : 'text-slate-700 dark:text-slate-300'}`}>Other</span>
                  </div>
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select your industry
              </label>
              <select name="industry" value={formData.industry} onChange={handleInputChange} disabled={!formData.businessType} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">{formData.businessType ? 'Select' : 'Select Business Type First'}</option>
                {formData.businessType && ((_a = INDUSTRY_OPTIONS[formData.businessType]) === null || _a === void 0 ? void 0 : _a.map((option) => (<option key={option} value={option}>{option}</option>)))}
              </select>
            </div>

            {/* Employee Count */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                How many of your employees will use Deputy?
              </label>
              <div className="flex flex-wrap gap-3">
                {['1-25', '26-49', '50-249', '250-749', '750+'].map((count) => (<button key={count} type="button" onClick={() => handleEmployeeCountSelect(count)} className={`px-6 py-2 rounded-full border text-sm font-medium transition-all ${formData.employeeCount === count
                ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400'
                : 'border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-gray-300'}`}>
                    {count}
                  </button>))}
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading} className="px-8 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                {loading ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:block w-1/2 bg-[#2D2B55] relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Clouds / Blobs */}
          <framer_motion_1.motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"/>
          <framer_motion_1.motion.div animate={{ x: [0, -150, 0], y: [0, 100, 0] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"/>
        </div>

        {/* Skyline */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center opacity-10 pointer-events-none z-0">
          <framer_motion_1.motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 1.5, ease: "easeOut" }} className="flex items-end space-x-8 text-white">
             <lucide_react_1.Building2 size={120}/>
             <lucide_react_1.Building2 size={180}/>
             <lucide_react_1.Building2 size={140}/>
             <lucide_react_1.Building2 size={200}/>
             <lucide_react_1.Building2 size={160}/>
          </framer_motion_1.motion.div>
        </div>

        {/* Active Characters */}
        
        {/* United Link Group - Main */}
        <AnimatedAvatar_1.AnimatedAvatar role="United Link Group" icon={lucide_react_1.Shield} color="bg-indigo-700" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute inset-0 flex items-center justify-center" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
                  <div className="w-full h-full rounded-full border-4 border-indigo-500/30 animate-ping"/>
              </framer_motion_1.motion.div>)} seed="UnitedLinkGroup" delay={0.1} position="left-[42%] top-[15%]" className="scale-110 z-30"/>

        {/* Security - Scanning */}
        <AnimatedAvatar_1.AnimatedAvatar role="Security" icon={lucide_react_1.ShieldCheck} color="bg-blue-600" activityIcon={({ className }) => (<framer_motion_1.motion.div className={`absolute inset-0 rounded-full border-2 border-blue-400`} animate={{ scale: [1, 1.5], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 2 }}/>)} seed="SecurityGuard" delay={0.2} position="left-[15%] bottom-[30%]"/>

        {/* Hospitality - Service */}
        <AnimatedAvatar_1.AnimatedAvatar role="Hospitality" icon={lucide_react_1.ConciergeBell} color="bg-orange-500" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute -top-4 right-0" animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}>
                  <span className="text-2xl">🛎️</span>
              </framer_motion_1.motion.div>)} seed="HotelStaff" delay={0.4} position="right-[15%] bottom-[35%]"/>

        {/* Care - Health */}
        <AnimatedAvatar_1.AnimatedAvatar role="Care Giver" icon={lucide_react_1.HeartHandshake} color="bg-pink-500" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute -top-6 -right-6" animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <span className="text-xl">❤️</span>
              </framer_motion_1.motion.div>)} seed="Nurse" delay={0.6} position="left-[35%] top-[25%]"/>

        {/* Admin - Working */}
        <AnimatedAvatar_1.AnimatedAvatar role="Admin" icon={lucide_react_1.Briefcase} color="bg-purple-600" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute -left-4 top-1/2" animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  <lucide_react_1.Activity size={16} className="text-white"/>
              </framer_motion_1.motion.div>)} seed="Manager" delay={0.8} position="right-[30%] top-[30%]"/>

        {/* Construction - Building */}
        <AnimatedAvatar_1.AnimatedAvatar role="Construction" icon={lucide_react_1.Hammer} color="bg-yellow-600" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute -right-4 top-0" animate={{ rotate: [0, 45, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
                  <lucide_react_1.Hammer size={16} className="text-yellow-600"/>
              </framer_motion_1.motion.div>)} seed="Builder" delay={1.0} position="left-[25%] bottom-[15%]"/>

        {/* Logistics - Delivery */}
        <AnimatedAvatar_1.AnimatedAvatar role="Logistics" icon={lucide_react_1.Truck} color="bg-green-600" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute -left-4 bottom-0" animate={{ x: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <lucide_react_1.Truck size={16} className="text-green-600"/>
              </framer_motion_1.motion.div>)} seed="Driver" delay={1.2} position="right-[20%] top-[15%]"/>

        {/* Food - Restaurant */}
        <AnimatedAvatar_1.AnimatedAvatar role="Restaurant" icon={lucide_react_1.Utensils} color="bg-red-500" activityIcon={({ className }) => (<framer_motion_1.motion.div className="absolute top-0 left-1/2" animate={{ y: [-5, 0, -5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  <span className="text-xl">🍳</span>
              </framer_motion_1.motion.div>)} seed="Chef" delay={1.4} position="left-[50%] bottom-[45%]"/>
      </div>
    </div>);
}
