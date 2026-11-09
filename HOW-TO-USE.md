# How to Use YT Research

This guide is for people who are new to YouTube research. It uses simple words.
Every short form of a word (an acronym) is explained when we use it.

---

## 1. What is this tool?

This tool helps you find **good ideas for YouTube videos**.

You type a topic (for example: "cooking" or "woodworking"). The tool then shows you:

- Other words people type on YouTube about that topic.
- How many people seem to want videos about it.
- How many big channels already make videos about it.
- Which topics are easy for a small channel to win.
- What the titles of the best videos look like.

It is free. It runs on your own computer. Nobody else can see what you search.

---

## 2. What you need before you start

| You need | What it is | Where to get it |
|---|---|---|
| A computer with Windows, Mac or Linux | Any normal computer | - |
| Node.js | A free program that runs this tool. Get version 18 or higher. | https://nodejs.org |
| Google Chrome | A web browser | https://www.google.com/chrome |
| A Google account | The same one you use for Gmail or YouTube | - |

For the **automatic key setup** (Step 3, Option A) you also need OpenCLI (Open Command Line Interface).
"Command line" means a black window where you type short commands. OpenCLI is a small free helper program.
It lets our setup script click buttons in Chrome for you. If you do not want to install it, use Option B instead.

---

## 3. Get the tool and your YouTube key

### Step 1 - Download the tool

Option 1 (easy): On the GitHub page of this project, click the green **Code** button, then **Download ZIP**.
(A ZIP is one compressed file that holds a whole folder.)
Open the ZIP file, then extract it ("extract" means "take the folder out of the ZIP"). Move the folder to your Desktop.

Option 2: If you know Git (a program that downloads code projects), run:

```bash
git clone https://github.com/X-techlord/yt-research.git
```

### Step 2 - Open the black window in the tool folder

- **Windows:** Open the folder. Click the address bar at the top. Type `cmd` and press Enter.
- **Mac:** Right-click the folder and choose "New Terminal at Folder".

### Step 3 - Get your own YouTube key

The tool needs a **key**. The full name is API (Application Programming Interface) key.
Think of it like this: an API (Application Programming Interface) is a door that lets one program ask YouTube for
information. The API (Application Programming Interface) key is your personal pass to use that door.
It is free. Google gives you a free amount to use every day.

**Important:** Every person on the team should make their **own** key. Do not share one key. All people who use the
same key share the same daily amount, and it runs out fast.

#### Option A - Automatic (the tool does the work for you)

1. Install OpenCLI (Open Command Line Interface). In the black window type:

   ```bash
   npm install -g @jackwener/opencli
   ```

2. Install the OpenCLI extension in Chrome. Open this page and click **Add to Chrome**:
   https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk
3. Check that it works. Type this and press Enter:

   ```bash
   opencli doctor
   ```

   Look for a line with `contextId`. That short code (for example `abc123xy`) is your **OpenCLI ID**
   (ID means Identification - a name or number that tells things apart). It names the Chrome profile you use.
   A Chrome profile is one "person" inside Chrome, with its own sign-ins.
4. Make sure you are signed in to your Google account in that Chrome profile.
5. Run the setup:

   ```bash
   node setup-key.mjs
   ```

6. It asks for your OpenCLI ID (Identification). Type it and press Enter.
7. Chrome opens by itself. The tool turns on the YouTube service for you and makes the key.
   If Google asks you to sign in, do it in Chrome, then press Enter in the black window.
8. At the end, Chrome shows a box called **"API key created"**. This is **your part**:
   - Click the small **copy icon** next to the key.
   - Open the file named `.env` in the tool folder with Notepad. (If you cannot see it, the tool made it for you
     when it reached this step. On Windows, turn on "Show hidden files" if needed.)
   - Paste the key after `YT_API_KEY=`. No spaces. No quotation marks. Save the file.
9. The black window tells you "Key works". You are done.

#### Option B - By hand (no OpenCLI needed)

1. Go to https://console.cloud.google.com and sign in. Make a new project if it asks.
2. Go to https://console.cloud.google.com/apis/library/youtube.googleapis.com and click **Enable**.
3. Go to https://console.cloud.google.com/apis/credentials. Click **Create credentials**, then **API key**.
4. Under "API restrictions", choose **YouTube Data API v3**. Click **OK**, then **Create**.
5. Copy the key. Make a copy of the file `.env.example` and name the copy `.env`.
6. Paste the key after `YT_API_KEY=` in `.env`. Save.

---

## 4. Start the tool

In the black window, in the tool folder, type:

```bash
node server.mjs
```

Leave the black window open. Now open Chrome and go to this web address:

**http://localhost:1402**

"localhost" means "this same computer". The page is not on the internet. Only you can see it.

To stop the tool, click the black window and press `Ctrl` and `C` together.
(If the number 1402 is already used by another program, open `.env` and change `PORT=1402` to another number, like `1500`.)

---

## 5. Your first research - step by step

**Step 1. Type your topic.** In the box at the top-left, type a short topic like `woodworking`. Press **Expand**.
This takes about 15 seconds. The tool asks YouTube what people type when they search for your topic.
You get a list of many ideas, called **keywords**. A keyword is a word or short phrase that people type into the
search box.

**Step 2. Click "Add search interest."** This asks Google Trends how popular each keyword is. It is free. A new
column called **I** fills in.

**Step 3. Click a keyword you like.** The tool looks at the top 20 videos for that keyword. The columns **D**, **S**
and **O** fill in, and the right side shows all the details. Each keyword you click uses some of your daily amount
(see Section 8).

**Step 4. Or click "Analyze top 8 unanalyzed"** to check eight keywords in a row.

**Step 5. Sort the table.** Click a column name (I, D, S or O) to sort. Click again to flip the order.

---

## 6. What do the columns mean?

Every score is a number from 0 to 100. The colors help you read them:

- **Green** = good for you
- **Yellow** = middle
- **Red** = not good for you

| Column | Full name | Simple meaning | What you want |
|---|---|---|---|
| **I** | Interest | How many people search for this on YouTube, compared with your main topic. `100` means the same as your main topic. `10` means about one tenth as much. | Higher is better |
| **D** | Demand | How much the best videos for this keyword are being watched each day. High demand means people want this. | Higher is better |
| **S** | Saturation | How crowded it is. "Saturation" means "too full". High number = many big channels already make this video. | **Lower is better** |
| **O** | Opportunity | Our best guess of how good this idea is for you. It mixes demand, crowding, and small channels doing well. | Higher is better |

**The arrows next to I:**

- A green arrow up means the topic is **growing** (more people search for it now than before).
- A red arrow down means the topic is **getting smaller**.
- No arrow means it is about the same.

**Other words you will see on the right side:**

- **Views per day** - how many people watch a video each day, on average. It is fairer than total views, because old videos
  have had more time to collect views.
- **Subscribers ("subs")** - people who follow a channel.
- **Big channel** - a channel with 100,000 or more subscribers. They are hard to beat.
- **Small-channel winner** - a small channel (10,000 subscribers or fewer) whose video got 10,000 or more views.
  This is a very good sign! It means a small channel can win with this topic.
- **Outlier** - a video that got **3 times more views than that channel normally gets**. It means the topic itself is
  strong, not just the channel.
- **Title patterns** - what the best titles have in common: how long they are, if they use numbers, brackets, or
  questions, and which words they use again and again.
- **Shorts** - very short videos (up to 3 minutes) that you swipe through on a phone. They get views in a different way,
  so the tool hides them by default (see "Long-form only" below).

---

## 7. How to pick a video idea (simple recipe)

1. Look for keywords where **O (Opportunity)** is high and **S (Saturation)** is low.
2. Prefer keywords with a green up-arrow in **I (Interest)**.
3. Click the keyword. Check **"small-channel winners"**. One or more is a great sign.
4. Read the **Outliers** list and the **Top videos** list. Open a few videos with the links.
5. Read the **Title patterns**. Write your own title in the same style. Do not copy anyone's title.
6. Make a video that is **better or different** from the top ones.

---

## 8. The daily limit (very important)

YouTube gives each key a free daily amount called a **quota** ("quota" means "how much you are allowed to use").

- Every full check of one keyword (the **D**, **S**, **O** numbers) uses about **102 units** (a unit is one piece of
  your daily amount).
- Your daily amount is 10,000 units. The tool stops at 9,000 to be safe. That is about **85 keywords per day**.
- The top of the page shows how much you used today.
- The amount resets every day at midnight in California (Pacific Time).
- If you check the same keyword again, it is almost free, because the tool remembers it for a while.
- **Expand** and **Add search interest** do **not** use your daily amount.

**Tip:** Do not check every keyword. First use **Expand** and **Add search interest** (both free). Then only click
the 10 or 20 best-looking keywords.

---

## 9. The "Long-form only" box

Under the buttons there is a box called **Long-form only**. "Long-form" means normal-length videos.

- **Ticked (default):** The tool ignores Shorts (videos of 3 minutes or less). Use this if you make normal videos.
- **Not ticked:** The tool includes Shorts. Use this if you make Shorts.

When you change it, click the keyword again to refresh its numbers.

---

## 10. Things to remember

- These numbers are **good guesses, not exact facts.** YouTube does not share the real number of searches. Use the
  tool to **compare ideas with each other**, not to say "exactly 5,000 people search for this".
- "Interest" is always **compared to your main topic**. If your main topic is very big (like "music"), small
  keywords will show 0 to 5. Try a more specific main topic for clearer numbers.
- Use this tool for ideas. Then use your own eyes and your own taste.

---

## 11. Problems and fixes

| What you see | What to do |
|---|---|
| "No YT_API_KEY in .env" at the top of the page | You have no key yet. Do Step 3 again. |
| "Quota exceeded" or "Daily quota budget reached" | You used the daily amount. Wait until tomorrow, or make a second key in a new Google project for **your own** use. |
| "Google Trends is rate-limiting this IP" (IP = Internet Protocol address, the number that names your internet connection) | Google is asking you to slow down. Wait 10 minutes and try again with fewer keywords. |
| The page does not open | Check that the black window is still open and says "yt-research running". Check the address is exactly `http://localhost:1402`. |
| "Port already in use" | Change `PORT=1402` in `.env` to another number, for example `1500`. Open `http://localhost:1500`. |
| `node` is not recognized | Install Node.js from https://nodejs.org, then close and open the black window again. |
| `opencli` is not recognized | Do Option A, step 1 again, then close and open the black window. |
| The setup says your Chrome profile is "not connected" | Open Chrome in that profile, and check the OpenCLI extension is installed and turned on. Run `opencli doctor` again. |
| YouTube says the key is not valid right after you made it | Wait one or two minutes. New keys need a short time to start working. |

---

## 12. Keep your key safe

- The key lives in the file `.env`. **Never send this file to anyone. Never put it on GitHub.**
  (The project already tells GitHub to ignore it.)
- Never write your key in a chat, an email, or a screenshot.
- If your key leaks: go to https://console.cloud.google.com/apis/credentials, delete the old key, and make a new one.

---

## 13. Word list

| Word | Simple meaning |
|---|---|
| API (Application Programming Interface) | A door that lets one program ask another service for information. YouTube has one. |
| API key | Your personal pass for that door. A long mix of letters and numbers. |
| ID (Identification) | A name or number that tells one thing apart from others. |
| OpenCLI (Open Command Line Interface) | A helper program that can control Chrome for you. We use it only in the automatic key setup. |
| IP (Internet Protocol) address | The number that names your internet connection. |
| Keyword | A word or phrase people type into a search box. |
| Quota | The free amount of YouTube information you can ask for each day. |
| Unit | One piece of your daily quota. |
| Long-form | Normal-length videos (longer than 3 minutes). |
| Shorts | Very short videos (up to 3 minutes) that you swipe on a phone. |
| Subscriber | A person who follows a channel. |
| Google Trends | A free Google website that shows how popular a search is over time. |
| Localhost | "This same computer". |
| Chrome profile | One "person" inside Chrome, with separate sign-ins and settings. |
