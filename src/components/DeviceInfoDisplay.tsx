import React, { useState, useEffect } from 'react';
import { Monitor, Clock, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function DeviceInfoDisplay() {
  const { theme } = useTheme();
  const [deviceInfo, setDeviceInfo] = useState({
    time: '',
    timezone: '',
    device: '',
    browser: '',
    resolution: '',
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      // Get current time
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Get timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = -now.getTimezoneOffset() / 60;
      const offsetStr = `UTC ${offset >= 0 ? '+' : ''}${offset}`;

      // Get device type
      const userAgent = navigator.userAgent;
      let deviceType = 'Desktop';
      if (/Mobile|Android|iPhone|iPad|iPod/.test(userAgent)) {
        deviceType = 'Mobile';
      } else if (/iPad|Android/.test(userAgent)) {
        deviceType = 'Tablet';
      }

      // Get browser
      let browser = 'Unknown';
      if (/Chrome/.test(userAgent)) browser = 'Chrome';
      else if (/Firefox/.test(userAgent)) browser = 'Firefox';
      else if (/Safari/.test(userAgent)) browser = 'Safari';
      else if (/Edge|Edg/.test(userAgent)) browser = 'Edge';
      else if (/MSIE|Trident/.test(userAgent)) browser = 'IE';

      // Get resolution
      const resolution = `${window.innerWidth}x${window.innerHeight}`;

      setDeviceInfo({
        time: timeStr,
        timezone: offsetStr,
        device: deviceType,
        browser: browser,
        resolution: resolution,
      });
    };

    updateDeviceInfo();
    const interval = setInterval(updateDeviceInfo, 1000); // Update every second

    window.addEventListener('resize', updateDeviceInfo);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateDeviceInfo);
    };
  }, []);

  // Light and dark mode color mappings
  const isDark = theme === 'dark';
  const accent = isDark ? '#D4A574' : '#753d3e';
  const bgColor = isDark ? 'bg-[#0f0f0f]' : 'bg-white';
  const borderColor = isDark ? 'border-[#D4A574]' : 'border-[#753d3e]';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-[#8B8B8B]' : 'text-gray-500';

  return (
    <div className="group relative">
      {/* Display compact info */}
      <div className={`flex items-center gap-3 px-4 py-2 ${bgColor} border ${borderColor} rounded-lg transition-all cursor-pointer`}>
        <Clock className="w-4 h-4" style={{ color: accent }} />
        <div className="flex flex-col gap-1">
          <div className={`text-xs ${textSecondary}`}>{deviceInfo.timezone}</div>
          <div className={`text-sm font-semibold ${textPrimary}`}>{deviceInfo.time}</div>
        </div>
      </div>

      {/* Detailed info tooltip */}
      <div className={`absolute right-0 top-full mt-2 w-48 ${bgColor} border ${borderColor} rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 shadow-lg`}>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
            <div>
              <p className={`text-xs ${textSecondary} uppercase`}>Time</p>
              <p className={`text-sm ${textPrimary} font-mono`}>{deviceInfo.time}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
            <div>
              <p className={`text-xs ${textSecondary} uppercase`}>Timezone</p>
              <p className={`text-sm ${textPrimary} font-mono`}>{deviceInfo.timezone}</p>
            </div>
          </div>

          <div className={`border-t ${borderColor} pt-3`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={`text-xs ${textSecondary} uppercase`}>Device</p>
                <p className={`text-xs ${textPrimary}`}>{deviceInfo.device}</p>
              </div>
              <div>
                <p className={`text-xs ${textSecondary} uppercase`}>Browser</p>
                <p className={`text-xs ${textPrimary}`}>{deviceInfo.browser}</p>
              </div>
            </div>
            <div className={`mt-3 pt-3 border-t ${borderColor}`}>
              <p className={`text-xs ${textSecondary} uppercase`}>Resolution</p>
              <p className={`text-xs ${textPrimary} font-mono`}>{deviceInfo.resolution}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
