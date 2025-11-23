
import React, { useMemo, useState, useEffect } from 'react';
import { WorkLog, UserSettings, Job } from '../types';
import { Trophy, Clock, Calendar, TrendingUp, DollarSign, X, ChevronRight, ChevronLeft, PieChart as PieIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface YearlyWrapUpProps {
  logs: WorkLog[];
  settings: UserSettings;
  jobs: Job[];
}

export const YearlyWrapUp: React.FC<YearlyWrapUpProps> = ({ logs, settings, jobs }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 5;

  const targetYear = useMemo(() => {
    if (logs.length === 0) return new Date().getFullYear();
    const years = logs.map(l => new Date(l.date).getFullYear());
    return Math.max(...years);
  }, [logs]);

  const stats = useMemo(() => {
      const yearLogs = logs.filter(l => new Date(l.date).getFullYear() === targetYear);
      if (yearLogs.length === 0) return null;

      const totalHours = yearLogs.reduce((sum, l) => sum + l.duration, 0);
      
      let totalEarnings = 0;
      const jobCounts: Record<string, number> = {};
      const dayCounts: Record<number, number> = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
      const monthEarnings: Record<number, number> = {};

      yearLogs.forEach(l => {
          const job = jobs.find(j => j.id === l.jobId);
          if (job) {
             const day = new Date(l.date).getDay();
             const isWeekend = day === 0 || day === 6;
             const rate = isWeekend ? job.weekendHourlyRate : job.hourlyRate;
             totalEarnings += l.duration * rate;
             
             jobCounts[job.id] = (jobCounts[job.id] || 0) + l.duration;
             dayCounts[day] += l.duration;
             
             const month = new Date(l.date).getMonth();
             monthEarnings[month] = (monthEarnings[month] || 0) + (l.duration * rate);
          }
      });

      // Top Job
      const topJobId = Object.keys(jobCounts).reduce((a, b) => jobCounts[a] > jobCounts[b] ? a : b);
      const topJob = jobs.find(j => j.id === topJobId);
      
      // Chart Data
      const pieData = Object.keys(jobCounts).map(id => {
          const job = jobs.find(j => j.id === id);
          return { name: job?.name || 'Unknown', value: jobCounts[id], color: job?.color || '#ccc' };
      });

      // Busiest Day
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const busiestDayIndex = Object.keys(dayCounts).reduce((a, b) => dayCounts[parseInt(a)] > dayCounts[parseInt(b)] ? a : b);
      const busiestDay = days[parseInt(busiestDayIndex)];

      // Best Month
      const bestMonthIndex = Object.keys(monthEarnings).reduce((a, b) => monthEarnings[parseInt(a)] > monthEarnings[parseInt(b)] ? a : b);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const bestMonth = months[parseInt(bestMonthIndex)];

      return { totalHours, totalEarnings, topJob, busiestDay, bestMonth, pieData };
  }, [logs, jobs, targetYear]);

  const handleNext = () => {
      if (currentSlide < totalSlides - 1) setCurrentSlide(prev => prev + 1);
      else navigate('/');
  };

  const handlePrev = () => {
      if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
  };
  
  // Keyboard navigation
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
          if (e.key === 'ArrowLeft') handlePrev();
          if (e.key === 'Escape') navigate('/');
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  if (!stats) {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] text-gray-500 dark:text-gray-400">
              <Clock className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
              <h2 className="text-xl font-bold mb-2">No Data Found for {targetYear}</h2>
              <p className="mb-6 text-center max-w-xs">Start logging your work hours to see your yearly wrapped story.</p>
              <Link to="/log" className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-700 transition-colors">Start Logging</Link>
          </div>
      );
  }

  // Slide Content Components
  const Slide0_Intro = () => (
      <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-pink-500 rounded-full mb-6 flex items-center justify-center shadow-lg shadow-pink-500/30 animate-pulse">
             <Calendar className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-400 mb-2">{targetYear}</h1>
          <h2 className="text-2xl font-bold text-white">Your Work Wrapped</h2>
          <p className="mt-4 text-white/60">Ready to see what you achieved?</p>
          <div className="mt-10 text-sm text-white/40 animate-bounce">Tap right to continue</div>
      </div>
  );

  const Slide1_Hours = () => (
      <div className="flex flex-col justify-center h-full px-6 animate-slide-up">
          <h3 className="text-2xl font-bold text-yellow-300 mb-2">You've been busy!</h3>
          <div className="text-6xl font-black text-white mb-4">{stats.totalHours.toFixed(1)} <span className="text-2xl text-white/50 font-medium">hours</span></div>
          <p className="text-xl text-white/80">That's how much time you dedicated to your hustle this year.</p>
          <div className="mt-8 bg-white/10 p-4 rounded-xl border border-white/10">
              <Clock className="w-8 h-8 text-yellow-300 mb-2" />
              <p className="text-sm text-gray-300">Time is money.</p>
          </div>
      </div>
  );

  const Slide2_Earnings = () => (
      <div className="flex flex-col justify-center h-full px-6 animate-slide-up">
          <h3 className="text-2xl font-bold text-green-400 mb-2">The Bag Secured 💰</h3>
          <div className="text-5xl font-black text-white mb-2">{settings.currency} {stats.totalEarnings.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
          <p className="text-lg text-white/70 mb-8">Estimated total earnings.</p>
          
          <div className="bg-green-500/20 p-6 rounded-2xl border border-green-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                 <div className="bg-green-500 p-3 rounded-full text-white"><DollarSign className="w-6 h-6"/></div>
                 <div>
                     <p className="text-white font-bold">Great job!</p>
                     <p className="text-green-200 text-sm">Keep stacking.</p>
                 </div>
              </div>
          </div>
      </div>
  );

  const Slide3_Jobs = () => (
      <div className="flex flex-col justify-center h-full px-6 animate-slide-up">
          <h3 className="text-xl font-bold text-purple-300 mb-4">Top Hustle</h3>
          <div className="text-4xl font-black text-white mb-2">{stats.topJob?.name}</div>
          <p className="text-white/60 mb-8">You spent the most time here.</p>

          <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie data={stats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                          {stats.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff'}} itemStyle={{color: '#fff'}} formatter={(value: number) => `${value.toFixed(1)} hrs`} />
                  </PieChart>
              </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-white/40 mt-2">Work Distribution</div>
      </div>
  );

  const Slide4_Summary = () => (
      <div className="flex flex-col justify-center h-full px-6 animate-slide-up">
          <h3 className="text-2xl font-bold text-blue-300 mb-6">The Highlights</h3>
          
          <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/10 p-4 rounded-xl flex items-center gap-4">
                  <div className="bg-blue-500/20 p-3 rounded-lg"><Calendar className="w-6 h-6 text-blue-300" /></div>
                  <div>
                      <p className="text-xs text-gray-400">Busiest Day</p>
                      <p className="text-xl font-bold text-white">{stats.busiestDay}</p>
                  </div>
              </div>

              <div className="bg-white/10 p-4 rounded-xl flex items-center gap-4">
                  <div className="bg-red-500/20 p-3 rounded-lg"><TrendingUp className="w-6 h-6 text-red-300" /></div>
                  <div>
                      <p className="text-xs text-gray-400">Best Month</p>
                      <p className="text-xl font-bold text-white">{stats.bestMonth}</p>
                  </div>
              </div>

              <div className="bg-white/10 p-4 rounded-xl flex items-center gap-4">
                  <div className="bg-yellow-500/20 p-3 rounded-lg"><Trophy className="w-6 h-6 text-yellow-300" /></div>
                  <div>
                      <p className="text-xs text-gray-400">Total Hours</p>
                      <p className="text-xl font-bold text-white">{stats.totalHours.toFixed(1)}</p>
                  </div>
              </div>
          </div>

          <button onClick={() => navigate('/')} className="mt-10 bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition-colors">
              Back to Dashboard
          </button>
      </div>
  );

  const slides = [Slide0_Intro, Slide1_Hours, Slide2_Earnings, Slide3_Jobs, Slide4_Summary];
  const ActiveSlide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 w-full p-2 flex gap-1 z-20 safe-area-pt">
            {slides.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                        className={`h-full bg-white transition-all duration-300 ease-out ${idx < currentSlide ? 'w-full' : (idx === currentSlide ? 'w-full' : 'w-0')}`}
                        style={{ transitionDuration: idx === currentSlide ? '3s' : '0s' }} // Simple visual trick, not a real timer
                    ></div>
                </div>
            ))}
        </div>

        {/* Close Button */}
        <button onClick={() => navigate('/')} className="absolute top-6 right-4 z-20 p-2 text-white/50 hover:text-white">
            <X className="w-6 h-6" />
        </button>

        {/* Click Zones */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrev}></div>
        <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={handleNext}></div>

        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-700 bg-gradient-to-br 
                ${currentSlide === 0 ? 'from-black via-purple-900 to-black' : ''}
                ${currentSlide === 1 ? 'from-black via-yellow-900/50 to-black' : ''}
                ${currentSlide === 2 ? 'from-black via-green-900/50 to-black' : ''}
                ${currentSlide >= 3 ? 'from-black via-blue-900/50 to-black' : ''}
            `}></div>
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/30 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-pink-500/20 rounded-full blur-[80px]"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 max-w-md mx-auto w-full h-full safe-area-pb">
            <ActiveSlide />
        </div>
        
        {/* Helper Hint */}
        {currentSlide === 0 && <div className="absolute bottom-10 w-full text-center text-white/30 text-xs animate-pulse pointer-events-none">Tap edges to navigate</div>}
    </div>
  );
};
