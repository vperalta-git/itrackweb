# I-TRACK - Fleet Management Mobile App

A comprehensive Expo + React Native mobile application for managing fleet vehicles, drivers, and real-time tracking with role-based access control for 6 user types.

## Project Overview

I-TRACK is a professional fleet management system built with Expo and React Native, providing real-time driver tracking, vehicle management, test drive scheduling, and complete fleet operations management.

**Key Features:**
- Real-time live location tracking with maps
- Role-based access control (6 user types)
- Vehicle inventory management
- Driver allocation & scheduling
- Test drive booking system
- Dispatcher workflows
- Comprehensive audit trails
- Notification center
- Form validation & dynamic data binding

## Architecture

### Project Structure

```
/app
  /(auth)/                    # Authentication screens
    sign-in.tsx              # Login with form validation
    forgot-password.tsx      # Password recovery
    reset-password.tsx       # Reset password form
    _layout.tsx              # Auth stack layout
  
  /(tabs)/                    # Main app screens (role-aware)
    _layout.tsx              # Bottom tab navigation (role-based)
    
    (admin)/                 # Admin dashboard & management
      dashboard.tsx          # Admin overview
      vehicles.tsx           # Vehicle management
      preparation.tsx        # Vehicle preparation
      driver-allocation.tsx  # Driver assignments
      test-drive.tsx         # Test drive management
      users.tsx              # User management
      reports.tsx            # Analytics & reports
      vehicle-detail.tsx     # Vehicle details
      driver-detail.tsx      # Driver details
    
    (dispatcher)/            # Dispatcher operations
      dashboard.tsx          # Live tracking overview
      checklist.tsx          # Vehicle prep checklist
      history.tsx            # Dispatch history
    
    (driver)/                # Driver interface
      dashboard.tsx          # Current trip tracking
      history.tsx            # Trip history
      trip-detail.tsx        # Trip details with map
    
    (vehicles)/              # Vehicle browsing
      index.tsx              # Vehicle list
      _layout.tsx            # Vehicle stack
    
    (allocations)/           # Allocation management
      index.tsx              # Allocation list
      _layout.tsx            # Allocation stack
    
    notifications.tsx        # Notification center
    profile.tsx              # User profile & settings
  
  /components/               # Reusable UI components
    Button.tsx               # Styled button variants
    Input.tsx                # Text input with validation
    Card.tsx                 # Card layouts
    Header.tsx               # Screen headers
    StatusBadge.tsx          # Status indicators
    Select.tsx               # Dropdown selector
    DatePicker.tsx           # Calendar date picker
    LoadingSpinner.tsx       # Loading animations
    EmptyState.tsx           # Empty state UI
    ProgressBar.tsx          # Progress indicators
    Checkbox.tsx             # Checkbox input
    Skeleton.tsx             # Skeleton loaders
    MapView.tsx              # Map with markers
    TripDetailsOverlay.tsx   # Trip info overlay
    ErrorBoundary.tsx        # Error handling
  
  /context/                  # Global state management
    AuthContext.tsx          # Authentication state
    AppContext.tsx           # App-wide state
  
  /constants/
    theme.ts                 # Design system & colors
  
  /hooks/                    # Custom React hooks
    useForm.ts               # Form state management
  
  /utils/                    # Utility functions
    validation.ts            # Form validation logic
    locationTracker.ts       # Location & GPS utilities
  
  /types/
    index.ts                 # TypeScript interfaces
  
  _layout.tsx                # Root layout with providers
```

## Design System

### Colors
- **Primary**: `#ef4444` (Red) - Main brand color
- **Secondary**: `#1f2937` (Gray-900) - Secondary actions
- **White**: `#ffffff` - Backgrounds
- **Grays**: Gray50-Gray900 - Neutral palette

### Typography
- **Font Family**: System sans-serif
- **Weights**: 400, 500, 600, 700
- **Sizes**: 12px - 28px with semantic scale

### Spacing
- **Base**: 4px unit scale (4, 8, 12, 16, 20, 24, 28, 32, etc.)

### Radius
- **sm**: 4px
- **md**: 8px
- **lg**: 12px
- **full**: 9999px

## Core Components

### Button
```typescript
<Button
  title="Sign In"
  variant="primary" // primary, secondary, outline, danger, ghost
  size="large"      // small, medium, large
  onPress={() => {}}
  loading={false}
  fullWidth
/>
```

### Input
```typescript
<Input
  label="Email"
  placeholder="user@example.com"
  value={email}
  onChangeText={setEmail}
  error={emailError}
  keyboardType="email-address"
/>
```

### Card
```typescript
<Card variant="elevated" padding="medium">
  <Text>Card content</Text>
</Card>
```

### StatusBadge
```typescript
<StatusBadge
  status="active"  // active, inactive, pending, completed, cancelled, error
  label="In Transit"
  size="medium"
/>
```

### MapView
```typescript
<MapViewComponent
  markers={[driverMarker, destinationMarker]}
  routes={[route1, route2]}
  initialRegion={...}
  showScale
/>
```

## Authentication & Authorization

### 6 User Roles

1. **Admin** - Full system access, analytics, user management
2. **Supervisor** - Monitor teams, approve allocations
3. **Manager** - Department-level management
4. **Sales Agent** - Test drive scheduling, customer management
5. **Dispatcher** - Vehicle preparation, route planning, driver assignment
6. **Driver** - Trip execution, live tracking, status updates

### Role-Based Features

Each role has custom:
- Dashboard with relevant metrics
- Navigation menu with permitted screens
- Feature visibility based on permissions
- Data filtering and access control

## Key Features

### Real-Time Tracking
- Live GPS location updates
- Interactive maps with route visualization
- ETA calculation
- Speed monitoring
- Multi-marker display

### Form Validation
- Email validation with regex
- Password strength checking
- Phone number validation
- Custom field validators
- Field-level error messages
- Touch-based error display

### State Management

**AuthContext** - Handles:
- User login/logout
- Role-based access control
- Permission checking
- Session management

**AppContext** - Manages:
- Global notifications
- Dark mode toggle
- Loading states
- App-wide settings

**useForm Hook** - Provides:
- Form state management
- Validation on change/blur
- Field error tracking
- Form submission handling
- Reset functionality

### Location Tracking
- Mock GPS simulator for testing
- Distance calculation
- ETA estimation
- Route interpolation
- Multiple location tracking

### Notification System
- In-app notification center
- Notification types (SMS, Email, In-App)
- Notification history
- Mark as read/unread

## Dependencies

### Core
- `expo@^52.0.0`
- `expo-router@^3.5.0` - File-based routing
- `react-native@0.76.0`
- `react@18.2.0`

### Navigation
- `@react-navigation/native`
- `@react-navigation/bottom-tabs`
- `@react-navigation/stack`
- `react-native-screens`
- `react-native-safe-area-context`
- `react-native-gesture-handler`
- `react-native-reanimated`

### Maps & Location
- `Mapbox Static Images API + Mapbox Search/Directions APIs`

### Styling
- `nativewind@^4.0.36`
- `tailwindcss@^4.0.0`

### Icons
- `react-native-vector-icons@^10.2.0`

### Utilities
- `date-fns@^4.1.0` - Date formatting
- `zod@^3.24.1` - Type validation
- `axios@^1.7.7` - HTTP client

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repo-url>

# Install dependencies
pnpm install

# Start the dev server
pnpm dev

# Run on specific platform
pnpm ios    # iOS simulator
pnpm android # Android emulator
pnpm web    # Web browser
```

### Environment Setup

Create `.env.local`:
```
EXPO_PUBLIC_API_URL=http://localhost:4000/api
EXPO_PUBLIC_EAS_PROJECT_ID=your-expo-project-id
EXPO_PUBLIC_ENVIRONMENT=development
```

Forgot-password OTP now depends on the backend password recovery endpoints and EmailJS being configured on the server.
Push notifications also require an Expo/EAS project ID plus platform push credentials configured for the build you install on a physical device.

## API Integration

The mobile app now reads from the backend-backed data layer. For production-ready integration you can still extend it with:

1. Persistent authentication tokens and refresh handling
2. Real GPS/device location updates for driver tracking
3. Real-time websocket updates for live tracking
4. Deep-link routing from push notifications to role-specific detail screens
5. Backend audit logging and activity history

## Form Validation Examples

### Sign In
```typescript
FormValidator.validateSignIn({
  email: 'user@example.com',
  password: 'Password123'
})
// Returns: { isValid: true, errors: {} }
```

### Vehicle Form
```typescript
FormValidator.validateVehicleForm({
  vehicleNumber: 'MH 02 AB 1234',
  type: 'SUV',
  model: 'Tesla Model S',
  registrationNumber: 'RJ-1234567'
})
```

### Custom Validation
```typescript
const form = useForm({
  initialValues: { email: '' },
  validate: (values) => {
    const errors = {};
    if (!FormValidator.validateEmail(values.email)) {
      errors.email = 'Invalid email';
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  }
})
```

## Development

### Adding New Screens

1. Create new screen file in appropriate folder
2. Use provided components from `/components`
3. Apply theme colors/spacing from `constants/theme`
4. Add navigation link in tab layout
5. Test with role-based permissions

### Adding New Components

1. Create component in `/components`
2. Accept style prop for customization
3. Use theme constants
4. Export from `index.ts`
5. Document usage

### Styling Guidelines

- Use `theme` constants for colors
- Use `theme.fonts.family.sans` for font families
- Apply consistent spacing: 4px units
- Follow semantic naming: `label`, `value`, `title`, `subtitle`
- Support light/dark modes via context

## Testing

The app includes:
- Component skeleton for testing
- Mock data for all features
- Error boundary for crash prevention
- Form validation for all inputs
- Loading states for async operations

## Performance Optimizations

- Lazy loading screens
- Memoized components where needed
- Efficient re-renders with proper state management
- Native map rendering
- Image optimization for markers

## Future Enhancements

- Real backend API integration
- Push notifications
- Offline mode
- Advanced analytics dashboard
- Document scanning (OCR)
- Integration with telematics systems
- Payment processing for test drives
- Multi-language support

## Support

For issues or feature requests, contact the development team.

## License

Proprietary - I-TRACK Fleet Management System
