# 🚀 How to Run RentMate Locally

## Problem
Opening HTML files directly (`file:///C:/Users/...`) causes security issues with Supabase.

## ✅ Solution: Use a Local Web Server

### **Option 1: Python (Easiest - if you have Python)**

1. Open PowerShell in your RentMate folder:
   - Right-click the RentMate folder
   - Select "Open in Terminal" or "Open PowerShell here"

2. Run this command:
   ```powershell
   python -m http.server 8000
   ```

3. Open your browser and go to:
   ```
   http://localhost:8000/signup.html
   ```

---

### **Option 2: Node.js `serve` (Recommended)**

1. Install `serve` globally (one-time):
   ```powershell
   npm install -g serve
   ```

2. In your RentMate folder, run:
   ```powershell
   serve -p 8000
   ```

3. Open your browser and go to:
   ```
   http://localhost:8000/signup.html
   ```

---

### **Option 3: VS Code Live Server (If you use VS Code)**

1. Install the "Live Server" extension in VS Code
2. Right-click `signup.html`
3. Select "Open with Live Server"
4. It will automatically open in your browser

---

### **Option 4: npx http-server (No installation needed)**

```powershell
npx http-server -p 8000
```

Then go to: `http://localhost:8000/signup.html`

---

## 🎯 After Starting the Server

1. **Go to:** `http://localhost:8000/signup.html`
2. **Fill in the form** and sign up
3. **It should work now!** ✅

---

## ⚠️ Important Notes

- **Always use `http://localhost`** - Never open HTML files directly
- **Keep the server running** while you're testing
- **Press Ctrl+C** in the terminal to stop the server
- **Use port 8000** (or any other port if 8000 is busy)

---

## 🔍 Why This is Necessary

Supabase uses:
- **CORS** (Cross-Origin Resource Sharing)
- **postMessage** for authentication
- **Secure cookies**

All of these require a proper `http://` or `https://` origin. The `file://` protocol doesn't provide this, causing the "Not initialized" error.

---

## ✅ Quick Test

After starting the server, test in browser console:

```javascript
// Should return true
await window.supabaseService.init()

// Should work now
await window.supabaseService.signUp('test@example.com', 'Test123!', 'Test User')
```
