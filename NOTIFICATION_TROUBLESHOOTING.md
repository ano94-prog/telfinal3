# Windows Notification Troubleshooting Guide

## Issue: Notifications Not Showing When Browser is Minimized

### Quick Fix Checklist

#### 1. Windows Notification Settings
```
Press Win + I → System → Notifications
```
- ✅ Ensure "Notifications" toggle is **ON**
- ✅ Scroll down and find your **browser** (Chrome/Edge/Firefox)
- ✅ Make sure it's **allowed** to send notifications
- ✅ Set notification priority to **High** or **Top**

#### 2. Windows Focus Assist
```
Press Win + A (Action Center)
Click "Focus assist" at bottom
```
- ✅ Set to **"Off"** - shows all notifications
- OR set to **"Priority only"** and add your browser to priority senders

#### 3. Browser Site Permissions
For your deployed site: `https://69087977-e448-4409-8834-4ee542fb9a17-00-9ct5qwolq6iq.riker.replit.dev`

**Chrome/Edge:**
1. Click the lock icon 🔒 in the address bar
2. Click "Site settings"
3. Find "Notifications"
4. Set to **"Allow"**

**Firefox:**
1. Click the lock icon 🔒 in the address bar  
2. Click "More information"
3. Go to "Permissions" tab
4. Find "Receive Notifications"
5. Check **"Allow"**

#### 4. Windows Notification Banner Settings
```
Win + I → System → Notifications → Click your browser
```
- ✅ Show notification banners: **ON**
- ✅ Show notifications in action center: **ON**  
- ✅ Play a sound when notification arrives: **ON**
- ✅ Show notifications on lock screen: **ON** (optional)

### Testing Steps

1. **Test with browser visible:**
   - Open admin panel
   - In another tab, submit a login/SMS
   - Notification should appear immediately

2. **Test with browser minimized:**
   - Minimize browser completely
   - Use another device or Postman to trigger a login
   - Windows notification should appear in taskbar

3. **Manual test from console (on deployed site):**
   ```javascript
   // Run this in browser console on the admin panel
   if (Notification.permission !== "granted") {
     await Notification.requestPermission();
   }
   
   new Notification("🧪 Manual Test", {
     body: "If you see this, notifications work!",
     requireInteraction: true,
     silent: false,
     tag: "test-" + Date.now()
   });
   ```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Permission shows "granted" but no notifications | Check Windows Focus Assist is OFF |
| Notifications work when browser visible only | Enable "Show notifications even when in focus mode" in Windows |
| No sound plays | Check browser notification sound settings in Windows |
| Notifications disappear too quickly | Code uses `requireInteraction: true` so they should stay |
| Replit domain blocks notifications | Try using a custom domain (Replit limitation) |

### Advanced: Service Worker Method

For better reliability when browser is minimized, use Service Worker notifications:

1. Service Worker is registered in the app
2. Notifications are shown via Service Worker API
3. This works even when the browser tab is in background

The service worker file is located at: `/public/sw.js`

### Still Not Working?

If notifications still don't appear when browser is minimized:

1. **Check Windows Event Viewer:**
   ```
   Win + X → Event Viewer
   Windows Logs → Application
   Look for notification-related errors
   ```

2. **Try Different Browser:**
   - Chrome/Edge usually have best notification support
   - Firefox may have stricter policies

3. **Replit-Specific Issue:**
   - Some hosting platforms have limitations
   - Consider deploying to Vercel, Netlify, or Railway
   - Or use a custom domain with Replit

4. **Test on Another Windows PC:**
   - Rule out system-specific issues
   - Check if notification settings are managed by organization/GPO

### Expected Behavior

✅ **With browser visible:** Notification appears both in-browser (toast) AND as Windows notification
✅ **With browser minimized:** Notification appears as Windows notification in Action Center
✅ **With browser closed:** Notifications WON'T work (WebSocket disconnected)

---

**Note:** The browser must remain open (can be minimized) for WebSocket connection to stay active and receive events from the server.
