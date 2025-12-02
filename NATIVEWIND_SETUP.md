# NativeWind Setup Guide

NativeWind (Tailwind CSS for React Native) has been successfully installed and configured in your app!

## ✅ What's Been Configured

1. **Dependencies Installed:**
   - `nativewind` - Tailwind CSS for React Native
   - `tailwindcss` - Tailwind CSS core
   - `react-native-svg-transformer` - For SVG support

2. **Configuration Files Created:**
   - `tailwind.config.js` - Tailwind configuration with custom colors matching your app theme
   - `babel.config.js` - Babel configuration for NativeWind
   - `metro.config.js` - Metro bundler configuration for NativeWind
   - `global.css` - Global CSS file with Tailwind directives
   - `nativewind-env.d.ts` - TypeScript definitions for NativeWind

3. **Files Updated:**
   - `index.ts` - Imports global.css
   - `tsconfig.json` - Added NativeWind type definitions

## 🎨 How to Use NativeWind

### Basic Usage

Instead of using `StyleSheet.create`, you can now use Tailwind classes directly:

```tsx
import { View, Text } from 'react-native';

// Before (StyleSheet)
<View style={styles.container}>
  <Text style={styles.title}>Hello</Text>
</View>

// After (NativeWind)
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-blue-500">Hello</Text>
</View>
```

### Example Component

```tsx
import { View, Text, TouchableOpacity } from 'react-native';

export default function MyComponent() {
  return (
    <View className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-4">
        Welcome to NativeWind!
      </Text>
      
      <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg">
        <Text className="text-white font-semibold text-center">
          Click Me
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 🎨 Custom Colors Available

The following custom colors have been configured to match your app theme:

- **Primary**: `bg-primary`, `text-primary`, `border-primary` (Blue: #0080FF)
- **Secondary**: `bg-secondary`, `text-secondary` (Green: #10B981)
- **Danger**: `bg-danger`, `text-danger` (Red: #EF4444)
- **Warning**: `bg-warning`, `text-warning` (Orange: #F59E0B)

You can also use color shades:
- `bg-primary-500` (default)
- `bg-primary-100` (light)
- `bg-primary-900` (dark)

## 📱 Responsive Design

NativeWind supports responsive breakpoints:

```tsx
<View className="w-full md:w-1/2 lg:w-1/3">
  <Text className="text-sm md:text-base lg:text-lg">
    Responsive Text
  </Text>
</View>
```

## 🌐 Web Support

NativeWind works seamlessly on both React Native and Web platforms. The same classes work on both!

## 🔄 Migration Strategy

You can gradually migrate your components:

1. **Start with new components** - Use NativeWind for all new screens/components
2. **Migrate existing components** - Convert StyleSheet to className as you update components
3. **Mix both approaches** - You can use both StyleSheet and className in the same component

### Example: Mixing Styles

```tsx
import { View, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  customStyle: {
    // Complex styles that are hard to express in Tailwind
  }
});

export default function MyComponent() {
  return (
    <View className="flex-1 bg-white p-4" style={styles.customStyle}>
      <Text className="text-xl font-bold">Mixed Styles</Text>
    </View>
  );
}
```

## 🚀 Next Steps

1. **Clear Metro cache**: `npx expo start --clear`
2. **Start using NativeWind** in your components
3. **Gradually migrate** existing components to use Tailwind classes

## 📚 Resources

- [NativeWind Documentation](https://www.nativewind.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)

## 💡 Tips

1. **Use className prop** instead of style prop for Tailwind classes
2. **Combine with existing styles** - You can still use StyleSheet for complex styles
3. **Use responsive prefixes** - `md:`, `lg:` for responsive design
4. **Custom colors** - Use the predefined colors or add more in `tailwind.config.js`

