'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Send, Clock, ArrowRight } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setStatus({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    try {
      setSubmitting(true);
      setStatus(null);
      
      // Update with your actual backend URL
      await axios.post('http://localhost:8000/api/lms/contact-messages/', formData);

      setStatus({ type: 'success', text: 'Message sent! We\'ll be in touch soon.' });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      setStatus({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Something went wrong. Please try again.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      
      <div className="max-w-6xl w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col lg:flex-row">
        
        {/* --- LEFT PANEL: Information (Dark) --- */}
        <div className="lg:w-5/12 bg-slate-900 text-white p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-900 rounded-full blur-3xl opacity-20 -ml-16 -mb-16 pointer-events-none"></div>

          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-6">Contact Information</h2>
            <p className="text-slate-400 mb-12 leading-relaxed">
              Have a question about our courses or need support? Fill out the form and our team will get back to you within 24 hours.
            </p>

            <div className="space-y-8">
              <ContactItem 
                icon={Mail} 
                title="Email" 
                content="info@xtute.com" 
              />
              <ContactItem 
                icon={Phone} 
                title="Phone" 
                content="+91-7042462748" 
              />
              <ContactItem 
                icon={MapPin} 
                title="Office" 
                content="Shop No. 332, 333, 334 Sector 7a, Faridabad, Haryana 12006" 
              />
              <ContactItem 
                icon={Clock} 
                title="Hours" 
                content="Mon-Sat, 9am - 6pm IST" 
              />
            </div>
          </div>

          <div className="relative z-10 mt-12 pt-12 border-t border-slate-800">
            <div className="flex gap-4">
              {/* Social Placeholders */}
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-purple-600 transition-colors cursor-pointer">
                  <ArrowRight className="h-4 w-4 -rotate-45" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- RIGHT PANEL: Form (Light) --- */}
        <div className="lg:w-7/12 p-10 lg:p-12 bg-white">
          <div className="max-w-md mx-auto lg:max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Send us a message</h2>
            <p className="text-slate-500 mb-8 text-sm">We'd love to hear from you. Let's start a conversation.</p>

            {status && (
              <div className={`p-4 mb-6 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
                status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
              }`}>
                {status.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Full Name</Label>
                  <Input 
                    id="name" name="name" 
                    value={formData.name} onChange={handleChange} 
                    placeholder="John Doe" 
                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Email Address</Label>
                  <Input 
                    id="email" name="email" type="email"
                    value={formData.email} onChange={handleChange} 
                    placeholder="john@example.com" 
                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Phone</Label>
                  <Input 
                    id="phone" name="phone" type="tel"
                    value={formData.phone} onChange={handleChange} 
                    placeholder="+91..." 
                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Subject</Label>
                  <Input 
                    id="subject" name="subject"
                    value={formData.subject} onChange={handleChange} 
                    placeholder="How can we help?" 
                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Message</Label>
                <Textarea 
                  id="message" name="message"
                  value={formData.message} onChange={handleChange} 
                  placeholder="Tell us more about your inquiry..." 
                  rows={5}
                  className="bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-none"
                />
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 rounded-xl text-md font-medium"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                  {!submitting && <Send className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Component for the Left Panel
function ContactItem({ icon: Icon, title, content }) {
  return (
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-purple-400">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-slate-400 text-sm mt-0.5 max-w-[200px] leading-snug">{content}</p>
      </div>
    </div>
  );
}