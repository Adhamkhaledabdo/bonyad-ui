# 🏠 HomeView & HomeService - Android Implementation Guide

## 📋 Table of Contents
1. [HomeView (User Home Screen)](#homeview-user-home-screen)
2. [HomeService (Technician Home Screen)](#homeservice-technician-home-screen)
3. [Component Details](#component-details)
4. [Android Implementation Notes](#android-implementation-notes)
5. [Data Models](#data-models)

---

# 👤 HOMEVIEW (User Home Screen)

## Page Structure & Layout

### **Fixed Elements (Always Visible):**

```
┌─────────────────────────────────────────┐
│  🏗️ LOGO    [🔔] [💬] [ℹ️]              │ ← Top Bar
├─────────────────────────────────────────┤
│  🔍 Search services...         [X]      │ ← Search Bar
├─────────────────────────────────────────┤
│                                         │
│  [DYNAMIC COMPONENTS - See below]       │
│                                         │
│  📋 Book an Appointment                 │ ← Button 1
│  📋 Project Request                     │ ← Button 2 (Tutorial spotlight)
│  📋 My Projects ▼                       │ ← Button 3 (Dropdown)
│      ├─ Available Projects              │
│      ├─ Running Projects                │
│      └─ Completed Projects              │
│  📋 Appointments                        │ ← Button 4
│                                         │
│  [MORE DYNAMIC COMPONENTS]              │
│                                         │
└─────────────────────────────────────────┘
│  [Profile] [+New] [🏠] [Projects] [📅] │ ← Tab Bar
└─────────────────────────────────────────┘
```

---

## Dynamic Components (Toggleable in Profile)

### **Component Order (Top to Bottom):**

#### **1. Advertisement Component** (Optional - OFF by default)
```
What it shows:
- Auto-rotating promotional banners (5 sec cycle)
- Gradient backgrounds (purple, green, orange)
- Discount badges ("50% OFF")
- Call-to-action buttons
- Sparkle animations

Android equivalent:
- ViewPager2 with auto-scroll
- Gradient backgrounds (GradientDrawable)
- Lottie animations for sparkles
- Timer for auto-rotation
```

**Dummy Data:**
```json
{
  "ads": [
    {
      "title": "Premium Subscription",
      "subtitle": "Get 3 months FREE",
      "discount": "50% OFF",
      "ctaText": "Upgrade Now",
      "backgroundColor": ["#6B46C1", "#9333EA"]
    }
  ]
}
```

---

#### **2. Stories Feature Component** (ON by default)
```
What it shows:
- Horizontal scrollable story circles
- "NEW" badge for unviewed stories
- Tap to open full-screen viewer
- Before/After image slider
- Auto-progress bars (5 sec each)
- Technician info + hire button

Android equivalent:
- RecyclerView horizontal
- Full-screen DialogFragment
- ViewPager2 for before/after
- Progress bars with animation
- Handler for auto-advance
```

**Dummy Data:**
```json
{
  "stories": [
    {
      "technicianName": "Ahmed Al-Rashid",
      "projectType": "Kitchen Renovation",
      "description": "Complete kitchen transformation in 3 weeks!",
      "rating": 5.0,
      "duration": "3 weeks",
      "budget": 25000,
      "isNew": true
    }
  ]
}
```

---

#### **3. Smart Recommendations Component** (ON by default)
```
What it shows:
- Horizontal scrollable technician cards
- Match score badges (95%, 92%)
- Star ratings + review count
- Distance from user
- Hourly rate + completed projects
- "Quick Hire" button

Android equivalent:
- RecyclerView horizontal
- CardView with gradients
- Material badge components
- Google Maps Distance Matrix API
- Click listeners on hire buttons
```

**Dummy Data:**
```json
{
  "recommendations": [
    {
      "id": 1,
      "name": "Ahmed Al-Rashid",
      "service": "Plumbing Expert",
      "rating": 4.9,
      "reviewCount": 127,
      "distance": "2.5 km away",
      "matchScore": 95,
      "hourlyRate": 150,
      "completedProjects": 89
    }
  ]
}
```

---

#### **4. Map Integration Component** (ON by default)
```
What it shows:
- Interactive map with technician markers
- Green pulse for available technicians
- Tap marker to see technician card
- Distance, rating, service info
- Quick stats (available now, nearby, avg response)
- "Full Map" button for expanded view

Android equivalent:
- Google Maps MapView
- Custom marker icons
- Pulse animation (ValueAnimator)
- InfoWindow for technician details
- BottomSheet for full map
```

**Dummy Data:**
```json
{
  "technicians": [
    {
      "id": 1,
      "name": "Ahmed Plumber",
      "service": "Plumbing",
      "rating": 4.9,
      "latitude": 24.7136,
      "longitude": 46.6753,
      "distance": "1.2 km",
      "isAvailable": true
    }
  ]
}
```

**Map Implementation:**
```kotlin
// Android - Google Maps
class MapFragment : Fragment() {
    private lateinit var googleMap: GoogleMap
    
    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        
        // Add markers for each technician
        technicians.forEach { tech ->
            val marker = googleMap.addMarker(
                MarkerOptions()
                    .position(LatLng(tech.latitude, tech.longitude))
                    .title(tech.name)
                    .icon(BitmapDescriptorFactory.fromResource(R.drawable.technician_marker))
            )
            
            // Pulse animation
            if (tech.isAvailable) {
                addPulseAnimation(marker)
            }
        }
    }
}
```

---

### **AFTER Fixed Buttons:**

The user sees these 4 buttons, then the dynamic components appear:
1. Book an Appointment
2. Request Project  
3. My Projects (dropdown)
4. Appointments

Then below: Advertisements → Stories → Recommendations → Map

---

# 🔧 HOMESERVICE (Technician Home Screen)

## Page Structure & Layout

### **Fixed Elements (Always Visible):**

```
┌─────────────────────────────────────────┐
│  [🔔] [💬] [ℹ️]            🏗️ LOGO      │ ← Top Bar
├─────────────────────────────────────────┤
│                                         │
│  [DYNAMIC COMPONENTS - See below]       │
│                                         │
│  💼 Create Portfolio (if no portfolio)  │ ← Button 1 (Optional)
│  💼 Projects ▼                          │ ← Button 2 (Dropdown)
│      ├─ Look for Offers [BID NOW!!!]    │
│      ├─ Direct Offers                   │
│      ├─ My Assigned Projects            │
│      └─ My Bids                         │
│  📅 Appointments                        │ ← Button 3
│                                         │
│  📅 Upcoming Appointments (if any)      │ ← Auto-loaded section
│  📅 Past Appointments (if any)          │ ← Auto-loaded section
│                                         │
│  [MORE DYNAMIC COMPONENTS]              │
│                                         │
└─────────────────────────────────────────┘
│  [Profile] [Projects] [🏠] [📅] [💳]   │ ← Tab Bar
└─────────────────────────────────────────┘
```

---

## Dynamic Components (Toggleable in Profile)

### **Component Order (Top to Bottom):**

#### **1. Advertisement Component** (Optional - OFF by default)
```
Same as user version - promotional banners
```

---

#### **2. Earnings Visualization Component** (ON by default - Technician only)
```
What it shows:
- Period selector (Today/Week/Month segmented control)
- Large earnings number with trend arrow (+15% ↑)
- Animated bar chart (7 days, staggered animation)
- Monthly goal progress ring
- Color-coded (green for positive, red for negative)

Android equivalent:
- TabLayout for period selector
- MPAndroidChart BarChart
- Circular ProgressBar for goals
- ValueAnimator for staggered animations
- Material cards
```

**Dummy Data:**
```json
{
  "earnings": {
    "totalEarnings": 4250,
    "trend": 15,
    "dailyEarnings": [450, 680, 520, 890, 750, 620, 340],
    "dayLabels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "currentEarnings": 12500,
    "monthlyGoal": 20000
  }
}
```

**Key Calculations:**
```
Progress Percentage = (currentEarnings / monthlyGoal) * 100
Trend = ((thisWeek - lastWeek) / lastWeek) * 100
Daily Bar Height = (amount / maxAmount) * maxHeight
```

---

#### **3. Gamification Component** (ON by default - Technician only)
```
What it shows:
Section A: Level Progress Card
- Circular level badge (Level 12)
- Level title ("Master Technician")
- XP progress bar (2850/3500 XP)
- Total projects count
- Streak counter with flame icon

Section B: Badges Showcase
- Horizontal scrollable badges
- Unlocked badges in color
- Locked badges in grayscale
- Rarity labels (Common/Rare/Epic/Legendary)
- Sparkle icons for rare badges

Section C: Leaderboard Preview
- Your rank (#8 in Riyadh)
- Position change (+2 this week)
- Trophy/crown for top 3
- "View All" button

Android equivalent:
- CardView with gradients
- Horizontal RecyclerView for badges
- Circular ProgressBar for XP
- Material badges
- Lottie for sparkle animations
```

**Dummy Data:**
```json
{
  "gamification": {
    "level": {
      "current": 12,
      "title": "Master Technician",
      "currentXP": 2850,
      "nextLevelXP": 3500,
      "totalProjects": 89,
      "streak": 15
    },
    "badges": [
      {
        "id": 1,
        "name": "Speed Demon",
        "description": "Respond in < 1 hour",
        "icon": "bolt",
        "isUnlocked": true,
        "rarity": "RARE"
      }
    ],
    "leaderboard": {
      "position": 8,
      "movement": "+2"
    }
  }
}
```

---

#### **4. Stories Feature Component** (ON by default)
```
Same as user version - success stories
```

---

#### **5. AI Suggestions Component** (ON by default - Technician only)
```
What it shows:
- Swipeable suggestion cards (ViewPager)
- Confidence percentage (92% confidence badge)
- Suggestion types: Bidding, Timing, Portfolio, Pricing
- Color-coded by type
- Action buttons ("Use This Bid", "Set Alert")
- Expandable details

Android equivalent:
- ViewPager2 with page indicator
- Material cards with elevation
- Chip for confidence percentage
- Button with ripple effects
- Expandable CardView
```

**Dummy Data:**
```json
{
  "suggestions": [
    {
      "id": 1,
      "type": "bidding",
      "title": "Smart Bid Suggestion",
      "message": "Based on similar kitchen renovation projects in Riyadh, we suggest bidding between SAR 3,500 - 4,200...",
      "actionText": "Use This Bid",
      "icon": "lightbulb",
      "color": "#FF6B00",
      "confidence": 92
    }
  ]
}
```

---

#### **6. Technician Map Component** (ON by default - Technician only)
```
What it shows:
- Interactive map with PROJECT markers (not technicians!)
- Markers color-coded by urgency:
  * RED = Critical
  * ORANGE = High
  * YELLOW = Medium
  * GRAY = Low
- Tap to see project card
- Quick stats (projects nearby, total value)
- "Full Map" button

Android equivalent:
- Google Maps with custom markers
- Marker clustering for many projects
- InfoWindow or BottomSheet for details
- Distance calculation
- Marker click listeners
```

**Dummy Data:**
```json
{
  "projects": [
    {
      "id": 1,
      "title": "Villa Renovation",
      "category": "Plumbing",
      "budget": 15000,
      "latitude": 24.7136,
      "longitude": 46.6753,
      "distance": "1.2 km",
      "urgency": "HIGH",
      "biddersCount": 3
    }
  ]
}
```

**Urgency Colors:**
```
CRITICAL = #FF0000 (Red) + pulse animation
HIGH = #FF6B00 (Orange)
MEDIUM = #FFA500 (Light Orange)
LOW = #808080 (Gray)
```

---

#### **7. Bid Now Projects Component** (ON by default - Technician only)
```
What it shows:
- Horizontal scrollable "hot" project cards
- "LIVE" indicator with red dot
- Project details (title, category, budget, duration)
- Posted time ("5 min ago")
- Current bidders count
- Location
- Urgency badge (CRITICAL/HIGH/MEDIUM/LOW)
- Pulsing animation for CRITICAL projects
- "BID NOW" button

Android equivalent:
- RecyclerView horizontal
- CardView with elevation
- Blink/pulse animation (ObjectAnimator)
- Real-time updates (WebSocket)
- Countdown timer for "posted X min ago"
```

**Dummy Data:**
```json
{
  "hotProjects": [
    {
      "id": 1,
      "title": "Villa Renovation",
      "category": "Plumbing",
      "budget": 15000,
      "duration": "3 weeks",
      "postedTime": "5 min ago",
      "biddersCount": 3,
      "location": "Al-Malqa, Riyadh",
      "urgency": "HIGH",
      "description": "Complete villa plumbing system replacement"
    }
  ]
}
```

---

### **AFTER Fixed Buttons (in order):**

Components appear in this order if enabled:
1. **Advertisements** (if toggled ON)
2. **Stories Feature**
3. **Smart Recommendations**
4. **Map Integration** (shows nearby technicians)

Then: Tab bar at bottom

---

# 🛠️ COMPONENT DETAILS FOR ANDROID

## Component Specifications

### **1. Smart Recommendations Component**

**Android Layout:**
```xml
<androidx.cardview.widget.CardView
    android:layout_width="match_parent"
    android:layout_height="wrap_content">
    
    <!-- Header -->
    <LinearLayout orientation="horizontal">
        <ImageView src="@drawable/ic_star" tint="#FFA500"/>
        <TextView text="Recommended For You" style="headline"/>
        <Button text="See All" style="text"/>
    </LinearLayout>
    
    <!-- Horizontal RecyclerView -->
    <androidx.recyclerview.widget.RecyclerView
        android:orientation="horizontal"
        android:layout_height="280dp"/>
        
</androidx.cardview.widget.CardView>
```

**Card Item (200dp width):**
```xml
<androidx.cardview.widget.CardView
    android:layout_width="200dp"
    android:elevation="8dp"
    android:radius="16dp">
    
    <LinearLayout orientation="vertical" padding="16dp">
        <!-- Profile Circle with Match Badge -->
        <FrameLayout>
            <ImageView
                android:layout_width="80dp"
                android:layout_height="80dp"
                android:background="@drawable/gradient_blue_circle"/>
            <TextView
                text="95%"
                android:background="#4CAF50"
                android:layout_gravity="top|end"/>
        </FrameLayout>
        
        <!-- Name & Service -->
        <TextView text="Ahmed Al-Rashid" style="headline"/>
        <TextView text="Plumbing Expert" style="caption" color="gray"/>
        
        <!-- Rating -->
        <LinearLayout orientation="horizontal">
            <ImageView src="@drawable/ic_star" tint="#FFC107"/>
            <TextView text="4.9"/>
            <TextView text="(127)" color="gray"/>
        </LinearLayout>
        
        <!-- Distance -->
        <TextView text="2.5 km away" textSize="12sp"/>
        
        <!-- Stats Row -->
        <LinearLayout orientation="horizontal">
            <TextView text="89" style="bold"/>
            <TextView text="projects" style="small"/>
            <View background="gray" width="1dp"/>
            <TextView text="150 SAR" style="bold"/>
            <TextView text="/hour" style="small"/>
        </LinearLayout>
        
        <!-- Quick Hire Button -->
        <Button
            text="Quick Hire"
            android:background="@drawable/gradient_blue"
            textColor="white"/>
    </LinearLayout>
</androidx.cardview.widget.CardView>
```

**Kotlin Code:**
```kotlin
data class RecommendedTechnician(
    val id: Int,
    val name: String,
    val service: String,
    val rating: Double,
    val reviewCount: Int,
    val distance: String,
    val matchScore: Int,
    val hourlyRate: Int,
    val completedProjects: Int
)

class RecommendationsAdapter : RecyclerView.Adapter<ViewHolder>() {
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val tech = technicians[position]
        holder.nameText.text = tech.name
        holder.serviceText.text = tech.service
        holder.ratingText.text = tech.rating.toString()
        // ... bind other fields
        
        holder.hireButton.setOnClickListener {
            // Navigate to technician profile or hire flow
        }
    }
}
```

---

### **2. Earnings Visualization Component**

**Android Layout:**
```xml
<androidx.cardview.widget.CardView>
    <LinearLayout orientation="vertical">
        <!-- Header with Period Selector -->
        <LinearLayout orientation="horizontal">
            <ImageView src="@drawable/ic_chart" tint="#4CAF50"/>
            <TextView text="Earnings Overview" style="headline"/>
        </LinearLayout>
        
        <com.google.android.material.tabs.TabLayout
            android:id="@+id/periodSelector">
            <Tab text="Today"/>
            <Tab text="Week"/>
            <Tab text="Month"/>
        </com.google.android.material.tabs.TabLayout>
        
        <!-- Total Earnings -->
        <TextView
            text="4,250"
            textSize="40sp"
            textColor="#4CAF50"
            style="bold"/>
        <TextView text="SAR" textSize="18sp"/>
        
        <!-- Trend Badge -->
        <Chip
            text="↑ 15% increase"
            chipBackgroundColor="#E8F5E9"
            textColor="#4CAF50"/>
        
        <!-- Bar Chart -->
        <com.github.mikephil.charting.charts.BarChart
            android:id="@+id/barChart"
            android:layout_height="120dp"/>
        
        <!-- Goal Progress -->
        <ProgressBar
            style="horizontal"
            android:progress="62"
            android:progressTint="#4CAF50"/>
        <TextView text="12,500 / 20,000 SAR"/>
    </LinearLayout>
</androidx.cardview.widget.CardView>
```

**Kotlin Code:**
```kotlin
// Setup bar chart
val barChart = findViewById<BarChart>(R.id.barChart)
val entries = listOf(
    BarEntry(0f, 450f),
    BarEntry(1f, 680f),
    BarEntry(2f, 520f),
    // ... more days
)

val dataSet = BarDataSet(entries, "Daily Earnings")
dataSet.setGradientColor(Color.parseColor("#4CAF50"), Color.parseColor("#81C784"))
dataSet.setDrawValues(false)

barChart.data = BarData(dataSet)
barChart.animateY(1000) // Animate for 1 second

// Stagger animation
entries.forEachIndexed { index, entry ->
    Handler().postDelayed({
        entry.y = entry.y // Trigger redraw
        barChart.notifyDataSetChanged()
    }, index * 100L)  // 100ms delay per bar
}
```

---

### **3. Gamification Component**

**Android Layout:**
```xml
<!-- Level Card -->
<androidx.cardview.widget.CardView>
    <LinearLayout>
        <!-- Level Badge (Circular) -->
        <FrameLayout width="70dp" height="70dp">
            <View android:background="@drawable/gradient_purple_circle"/>
            <LinearLayout orientation="vertical" gravity="center">
                <TextView text="LEVEL" textSize="8sp"/>
                <TextView text="12" textSize="24sp" style="bold"/>
            </LinearLayout>
        </FrameLayout>
        
        <!-- Level Info -->
        <LinearLayout orientation="vertical">
            <TextView text="Master Technician" style="title3"/>
            <TextView text="89 projects"/>
            <TextView text="🔥 15 day streak"/>
            
            <!-- XP Progress -->
            <ProgressBar
                style="horizontal"
                android:progress="81"
                android:progressTint="@color/purple"/>
            <TextView text="2850 XP / 3500 XP"/>
        </LinearLayout>
    </LinearLayout>
</androidx.cardview.widget.CardView>

<!-- Badges Horizontal RecyclerView -->
<androidx.recyclerview.widget.RecyclerView
    android:orientation="horizontal"/>
    
<!-- Leaderboard Preview -->
<androidx.cardview.widget.CardView>
    <LinearLayout>
        <TextView text="🏆 Leaderboard"/>
        <TextView text="#8" style="large_bold"/>
        <TextView text="Your Rank in Riyadh"/>
        <TextView text="↑ +2 this week" color="green"/>
    </LinearLayout>
</androidx.cardview.widget.CardView>
```

**Badge Item Layout:**
```xml
<androidx.cardview.widget.CardView
    android:layout_width="100dp">
    <LinearLayout orientation="vertical" gravity="center">
        <!-- Badge Circle -->
        <View
            width="60dp"
            height="60dp"
            android:background="@drawable/badge_gradient"/>
        <ImageView src="@drawable/ic_bolt" tint="white"/>
        
        <!-- Badge Info -->
        <TextView text="Speed Demon" style="small_bold"/>
        <TextView text="Respond in < 1 hour" style="tiny"/>
        <Chip text="RARE" chipBackgroundColor="#2196F3"/>
    </LinearLayout>
</androidx.cardview.widget.CardView>
```

**Kotlin Code:**
```kotlin
data class UserLevel(
    val current: Int,
    val title: String,
    val currentXP: Int,
    val nextLevelXP: Int,
    val totalProjects: Int,
    val streak: Int
)

data class Badge(
    val id: Int,
    val name: String,
    val description: String,
    val icon: Int, // R.drawable.ic_bolt
    val isUnlocked: Boolean,
    val rarity: BadgeRarity
)

enum class BadgeRarity(val color: Int) {
    COMMON(Color.GRAY),
    RARE(Color.BLUE),
    EPIC(Color.parseColor("#9C27B0")),
    LEGENDARY(Color.parseColor("#FFD700"))
}
```

---

### **4. AI Suggestions Component**

**Android Layout:**
```xml
<androidx.viewpager2.widget.ViewPager2
    android:id="@+id/suggestionsViewPager"
    android:layout_height="220dp">
    
    <!-- Each page is an AI Suggestion Card -->
    <androidx.cardview.widget.CardView>
        <LinearLayout orientation="vertical" padding="20dp">
            <!-- Header -->
            <LinearLayout orientation="horizontal">
                <View
                    width="50dp"
                    height="50dp"
                    android:background="@drawable/circle_orange_bg"/>
                <ImageView src="@drawable/ic_lightbulb"/>
                
                <TextView text="Smart Bid Suggestion"/>
                <Chip text="92% confidence" chipBackgroundColor="#E3F2FD"/>
            </LinearLayout>
            
            <!-- Message -->
            <TextView
                text="Based on similar kitchen..."
                maxLines="3"/>
            
            <!-- Actions -->
            <LinearLayout orientation="horizontal">
                <Button
                    text="Use This Bid"
                    android:background="@color/orange"/>
                <Button
                    text="Learn More"
                    style="borderless"/>
            </LinearLayout>
        </LinearLayout>
    </androidx.cardview.widget.CardView>
</androidx.viewpager2.widget.ViewPager2>

<com.google.android.material.tabs.TabLayout
    android:id="@+id/pageIndicator"/>
```

---

### **5. Technician Map Component** (Nearby Projects)

**Android Implementation:**
```kotlin
class TechnicianMapFragment : Fragment(), OnMapReadyCallback {
    private lateinit var googleMap: GoogleMap
    private val projects = mutableListOf<MapProject>()
    
    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        
        // Set camera to Riyadh
        val riyadh = LatLng(24.7136, 46.6753)
        googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(riyadh, 12f))
        
        // Add project markers
        projects.forEach { project ->
            val markerColor = when (project.urgency) {
                "CRITICAL" -> BitmapDescriptorFactory.HUE_RED
                "HIGH" -> BitmapDescriptorFactory.HUE_ORANGE
                "MEDIUM" -> BitmapDescriptorFactory.HUE_YELLOW
                else -> BitmapDescriptorFactory.HUE_AZURE
            }
            
            val marker = googleMap.addMarker(
                MarkerOptions()
                    .position(LatLng(project.latitude, project.longitude))
                    .title(project.title)
                    .snippet("Budget: ${project.budget} SAR")
                    .icon(BitmapDescriptorFactory.defaultMarker(markerColor))
            )
            
            // Add pulse animation for critical projects
            if (project.urgency == "CRITICAL") {
                addPulseCircle(marker.position)
            }
        }
        
        // Marker click listener
        googleMap.setOnMarkerClickListener { marker ->
            showProjectBottomSheet(marker)
            true
        }
    }
    
    private fun addPulseCircle(position: LatLng) {
        val circle = googleMap.addCircle(
            CircleOptions()
                .center(position)
                .radius(100.0)
                .strokeColor(Color.RED)
                .strokeWidth(2f)
                .fillColor(Color.parseColor("#33FF0000"))
        )
        
        // Animate radius
        val animator = ValueAnimator.ofFloat(100f, 200f)
        animator.duration = 1000
        animator.repeatCount = ValueAnimator.INFINITE
        animator.repeatMode = ValueAnimator.REVERSE
        animator.addUpdateListener { animation ->
            circle.radius = (animation.animatedValue as Float).toDouble()
        }
        animator.start()
    }
}
```

---

### **6. Advertisement Component**

**Android Layout:**
```xml
<androidx.viewpager2.widget.ViewPager2
    android:id="@+id/adViewPager"
    android:layout_height="180dp">
    
    <!-- Each page -->
    <FrameLayout>
        <!-- Gradient Background -->
        <View android:background="@drawable/gradient_purple"/>
        
        <!-- Content -->
        <LinearLayout orientation="horizontal" padding="20dp">
            <!-- Icon Side -->
            <LinearLayout orientation="vertical" gravity="center">
                <View
                    width="70dp"
                    height="70dp"
                    android:background="@drawable/white_circle_20"/>
                <ImageView src="@drawable/ic_crown" tint="white"/>
                
                <TextView
                    text="50% OFF"
                    android:background="#FF0000"
                    textColor="white"
                    padding="4dp_10dp"
                    cornerRadius="8dp"/>
            </LinearLayout>
            
            <!-- Text Side -->
            <LinearLayout orientation="vertical">
                <TextView
                    text="Premium Subscription"
                    textSize="20sp"
                    textColor="white"
                    style="bold"/>
                <TextView
                    text="Get 3 months FREE"
                    textSize="16sp"
                    textColor="#E0E0E0"/>
                <TextView
                    text="Unlock unlimited bids..."
                    textSize="12sp"
                    textColor="#CCCCCC"/>
                
                <!-- CTA Button -->
                <Button
                    text="Upgrade Now →"
                    android:background="@drawable/white_bg_20"
                    textColor="white"
                    cornerRadius="20dp"/>
            </LinearLayout>
        </LinearLayout>
        
        <!-- Sparkle overlay -->
        <ImageView
            src="@drawable/sparkle"
            android:alpha="0.6"
            multiple_random_positions/>
    </FrameLayout>
</androidx.viewpager2.widget.ViewPager2>

<com.google.android.material.tabs.TabLayout
    app:tabBackground="@drawable/tab_selector"/>
```

**Auto-rotation:**
```kotlin
val handler = Handler(Looper.getMainLooper())
val runnable = object : Runnable {
    override fun run() {
        val nextItem = (viewPager.currentItem + 1) % adapter.itemCount
        viewPager.setCurrentItem(nextItem, true)
        handler.postDelayed(this, 5000) // 5 seconds
    }
}
handler.postDelayed(runnable, 5000)
```

---

### **7. Stories Feature Component**

**Android Implementation:**
```kotlin
// Story Ring Item (Horizontal RecyclerView)
class StoryRingAdapter : RecyclerView.Adapter<ViewHolder>() {
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val story = stories[position]
        
        // Story ring with gradient border
        holder.ringView.setStroke(
            width = 3.dp,
            color = if (story.isNew) {
                intArrayOf(Color.parseColor("#9C27B0"), Color.parseColor("#E91E63"))
            } else {
                intArrayOf(Color.GRAY, Color.GRAY)
            }
        )
        
        // Show "NEW" badge
        holder.newBadge.visibility = if (story.isNew) View.VISIBLE else View.GONE
        
        holder.itemView.setOnClickListener {
            showStoryViewer(story)
        }
    }
}

// Full-screen Story Viewer
class StoryViewerActivity : AppCompatActivity() {
    private lateinit var viewPager: ViewPager2
    private var currentPage = 0
    private val progressBars = mutableListOf<ProgressBar>()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Setup ViewPager for before/after
        viewPager = findViewById(R.id.storyViewPager)
        viewPager.adapter = StoryPagerAdapter(listOf("before", "after"))
        
        // Auto-advance after 5 seconds
        Handler().postDelayed({
            if (currentPage < 1) {
                viewPager.setCurrentItem(currentPage + 1, true)
                currentPage++
            } else {
                finish() // Close viewer
            }
        }, 5000)
        
        // Animate progress bars
        animateProgressBar(0, 5000)
    }
    
    private fun animateProgressBar(index: Int, duration: Long) {
        val animator = ObjectAnimator.ofInt(progressBars[index], "progress", 0, 100)
        animator.duration = duration
        animator.interpolator = LinearInterpolator()
        animator.start()
    }
}
```

---

### **8. Map Component Differences**

#### **User Map (Technicians):**
```kotlin
// Shows TECHNICIANS on map
data class MapTechnician(
    val id: Int,
    val name: String,
    val service: String,
    val latitude: Double,
    val longitude: Double,
    val isAvailable: Boolean  // Green pulse if true
)

// Marker icon: Wrench icon
// Marker color: Green if available, Gray if busy
```

#### **Technician Map (Projects):**
```kotlin
// Shows PROJECTS on map
data class MapProject(
    val id: Int,
    val title: String,
    val category: String,
    val budget: Int,
    val latitude: Double,
    val longitude: Double,
    val urgency: ProjectUrgency  // Color-coded
)

// Marker icon: Briefcase icon
// Marker color: Red/Orange/Yellow/Gray based on urgency
```

---

## 🎨 DESIGN SPECIFICATIONS

### **Colors:**

```
Primary Blue: #0080E0
Light Blue: #00A0FF
Green: #4CAF50
Orange: #FF6B00
Red: #FF0000
Purple: #9C27B0
Yellow: #FFC107

Gradients:
Blue: #0080E0 → #00A0FF
Purple: #6B46C1 → #9333EA
Green: #10B981 → #059669
Orange: #F59E0B → #D97706
```

### **Spacing:**
```
Component padding: 16dp (mobile), 24dp (tablet)
Card padding: 20dp
Card radius: 16dp
Button radius: 12dp
Icon size: 28dp (large), 20dp (medium), 16dp (small)
Card elevation: 8dp
```

### **Typography:**
```
Headline: 18sp, Bold
Title: 16sp, Semibold
Body: 14sp, Regular
Caption: 12sp, Regular
Small: 10sp, Regular
```

---

## 🔄 STATE MANAGEMENT

### **Toggle System (Android):**

```kotlin
object HomeFeatureSettings {
    private const val PREFS_NAME = "home_features"
    
    fun isSmartRecommendationsEnabled(context: Context): Boolean {
        return context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getBoolean("smart_recommendations", true)
    }
    
    fun setSmartRecommendationsEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putBoolean("smart_recommendations", enabled)
            .apply()
    }
    
    // Repeat for all 8 features...
}
```

**Settings Screen:**
```xml
<androidx.preference.PreferenceScreen>
    <SwitchPreferenceCompat
        app:key="smart_recommendations"
        app:title="Smart Recommendations"
        app:summary="Recommended technicians near you"
        app:defaultValue="true"
        app:icon="@drawable/ic_star"/>
        
    <SwitchPreferenceCompat
        app:key="earnings_visualization"
        app:title="Earnings Dashboard"
        app:summary="Visualize your earnings"
        app:defaultValue="true"
        app:icon="@drawable/ic_chart"/>
    
    <!-- ... other 6 toggles -->
</androidx.preference.PreferenceScreen>
```

---

## 📱 ANDROID DEPENDENCIES

### **build.gradle:**
```gradle
dependencies {
    // Maps
    implementation 'com.google.android.gms:play-services-maps:18.2.0'
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    
    // Charts
    implementation 'com.github.PhilJay:MPAndroidChart:v3.1.0'
    
    // UI Components
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.cardview:cardview:1.0.0'
    
    // ViewPager
    implementation 'androidx.viewpager2:viewpager2:1.0.0'
    
    // Image Loading
    implementation 'com.github.bumptech.glide:glide:4.16.0'
    
    // Networking (if needed)
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    
    // Animations
    implementation 'com.airbnb.android:lottie:6.1.0'
}
```

---

## 🎯 IMPLEMENTATION PRIORITY FOR ANDROID

### **Phase 1 (Essential):**
1. ✅ Smart Recommendations
2. ✅ Stories Feature
3. ✅ Basic Map Integration

### **Phase 2 (Enhanced):**
4. ✅ Earnings Visualization
5. ✅ Gamification
6. ✅ Hot Projects

### **Phase 3 (Advanced):**
7. ✅ AI Suggestions
8. ✅ Advertisements

---

## 📊 COMPONENT COMPARISON TABLE

| Component | iOS (Swift) | Android | Complexity |
|-----------|-------------|---------|------------|
| Smart Recommendations | ScrollView + Cards | RecyclerView | Easy |
| Earnings Charts | SwiftUI Charts | MPAndroidChart | Medium |
| Stories | TabView + FullScreenCover | ViewPager2 + Activity | Medium |
| Map (Technicians) | MapKit | Google Maps | Easy |
| Map (Projects) | MapKit | Google Maps | Easy |
| AI Suggestions | TabView | ViewPager2 | Easy |
| Gamification | Custom Views | Custom Views | Medium |
| Hot Projects | ScrollView | RecyclerView | Easy |
| Advertisements | TabView | ViewPager2 | Easy |

---

## ✅ QUICK CHECKLIST FOR ANDROID DEVELOPER

- [ ] Create 9 Fragment/Composable files for components
- [ ] Add Google Maps API key to manifest
- [ ] Implement SharedPreferences for toggles
- [ ] Create Settings screen with switches
- [ ] Add navigation from Profile → Settings
- [ ] Integrate components into HomeFragment (users)
- [ ] Integrate components into TechnicianHomeFragment
- [ ] Place components AFTER existing buttons
- [ ] Use dummy data from this guide
- [ ] Test on phone and tablet
- [ ] Add animations (pulse, fade, slide)
- [ ] Implement horizontal scrolling where needed
- [ ] Add localization (EN/AR)

---

## 🎁 BONUS FEATURES TO ADD

### **Pull-to-Refresh:**
```kotlin
swipeRefreshLayout.setOnRefreshListener {
    // Reload all components
    loadRecommendations()
    loadEarnings()
    loadStories()
    // ...
    swipeRefreshLayout.isRefreshing = false
}
```

### **Shimmer Loading:**
```gradle
implementation 'com.facebook.shimmer:shimmer:0.5.0'
```

### **Animations:**
```gradle
implementation 'com.airbnb.android:lottie:6.1.0'
```

---

## 📝 NOTES FOR ANDROID DEVELOPER

### **Key Differences from iOS:**

1. **Maps:**
   - iOS uses MapKit (free)
   - Android uses Google Maps (requires API key)
   - Get API key: https://console.cloud.google.com/

2. **Charts:**
   - iOS uses built-in Charts framework
   - Android use MPAndroidChart library

3. **Stories:**
   - iOS uses TabView + modal
   - Android use ViewPager2 + new Activity/Fragment

4. **Animations:**
   - iOS uses SwiftUI animations
   - Android use ObjectAnimator, ValueAnimator, Lottie

5. **Settings:**
   - iOS uses UserDefaults
   - Android use SharedPreferences

### **Component Positioning:**

```
IMPORTANT: All dynamic components appear AFTER the fixed buttons!

HomeView Order:
1. Top bar
2. Search bar
3. [Book Appointment button]
4. [Request Project button]
5. [My Projects dropdown]
6. [Appointments button]
← Components appear here ↓
7. Advertisements (if enabled)
8. Stories
9. Smart Recommendations
10. Map
11. Tab bar

HomeService Order:
1. Top bar
2. [Create Portfolio button] (if no portfolio)
3. [Projects dropdown]
4. [Appointments button]
5. [Upcoming/Past appointments sections]
← Components appear here ↓
6. Advertisements (if enabled)
7. Earnings Visualization
8. Gamification
9. Stories
10. AI Suggestions
11. Technician Map (projects)
12. Hot Projects
13. Tab bar
```

---

## 🌍 LOCALIZATION STRINGS NEEDED

All strings are provided in English and Arabic in the localization files.
For Android, create `strings.xml` and `strings-ar.xml` with these keys:

```xml
<!-- strings.xml -->
<string name="recommended_for_you">Recommended For You</string>
<string name="see_all">See All</string>
<string name="quick_hire">Quick Hire</string>
<string name="earnings_overview">Earnings Overview</string>
<string name="success_stories">Success Stories</string>
<string name="nearby_technicians">Nearby Technicians</string>
<string name="nearby_projects">Nearby Projects</string>
<string name="ai_assistant">AI Assistant</string>
<string name="hot_projects">Hot Projects</string>
<string name="bid_now">Bid Now</string>
<!-- ... etc (50+ strings total) -->
```

---

## 🎯 FINAL NOTES

**This guide provides everything needed to replicate the iOS home screens in Android:**

✅ All 9 components documented
✅ Layout specifications
✅ Android code examples
✅ Dummy data provided
✅ Dependencies list
✅ Design specs (colors, spacing, typography)
✅ Implementation priority
✅ Checklist for developers

**Give this file to your Android developer or paste into Cursor AI for Android implementation!**

---

**Created For:** Android Implementation
**Based On:** Bonyad iOS App v2.0
**Last Updated:** October 2025
**Pages Documented:** HomeView (Users) + HomeService (Technicians)
**Components:** 9 interactive widgets
**Status:** Ready for Android development

