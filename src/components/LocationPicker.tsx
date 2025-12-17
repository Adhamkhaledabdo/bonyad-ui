import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Static libraries array to prevent LoadScript reload
const LIBRARIES: ("places" | "drawing" | "geometry" | "localContext" | "visualization" | "marker")[] = ['places', 'marker'];

interface LocationPickerProps {
  initialLocation?: { latitude: number; longitude: number };
  initialAddress?: string;
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  onClose: () => void;
}

export default function LocationPicker({ 
  initialLocation, 
  initialAddress,
  onLocationSelect, 
  onClose 
}: LocationPickerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(initialLocation || { latitude: 0, longitude: 0 });
  const [address, setAddress] = useState(initialAddress || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapKey, setMapKey] = useState(0); // Force remount of GoogleMap
  const [showMap, setShowMap] = useState(false); // Control map visibility
  const [isGettingLocation, setIsGettingLocation] = useState(false); // Track if we're fetching location
  const mapRef = useRef<any>(null);
  const mapViewRef = useRef<any>(null); // For Android MapView
  const markerRef = useRef<any>(null);
  const markerReadyRef = useRef<boolean>(false); // Track if marker is ready
  const autocompleteService = useRef<any>(null);
  const geocoder = useRef<any>(null);

  // Initialize Google Maps services when available
  const initGoogleServices = () => {
    if (Platform.OS === 'web' && (window as any).google && (window as any).google.maps) {
      try {
        if (!autocompleteService.current) {
          autocompleteService.current = new (window as any).google.maps.places.AutocompleteService();
        }
        if (!geocoder.current) {
          geocoder.current = new (window as any).google.maps.Geocoder();
        }
        console.log('✅ Google Maps services initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Google Maps services:', error);
      }
    }
  };

  // Try to initialize services when window.google becomes available
  useEffect(() => {
    if (Platform.OS === 'web') {
      if ((window as any).google && (window as any).google.maps) {
        initGoogleServices();
      } else {
        // Poll until Google Maps is loaded
        const checkGoogle = setInterval(() => {
          if ((window as any).google && (window as any).google.maps) {
            initGoogleServices();
            clearInterval(checkGoogle);
          }
        }, 100);
        
        return () => clearInterval(checkGoogle);
      }
    }
  }, []);

  useEffect(() => {
    // Reset everything and force remount when modal opens
    console.log('🗑️ Clearing old map state...');
    
    // Clear refs
    if (markerRef.current) {
      try {
        markerRef.current.map = null;
      } catch (error) {
        console.log('Error clearing marker:', error);
      }
      markerRef.current = null;
    }
    markerReadyRef.current = false;
    mapRef.current = null;
    autocompleteService.current = null;
    geocoder.current = null;
    
    // Only get current location if no initial location is provided
    // This means:
    // - First time: no initialLocation -> get current location
    // - Subsequent times: has initialLocation -> use that location
    if (Platform.OS !== 'web' && (!initialLocation || initialLocation.latitude === 0)) {
      console.log('📍 No initial location, fetching current location...');
      getCurrentLocation();
    } else if (initialLocation && initialLocation.latitude !== 0) {
      console.log('📍 Using initial location:', initialLocation);
      setLocation(initialLocation);
    }
    
    // Hide map briefly then show it to force remount
    setShowMap(false);
    setTimeout(() => {
      setMapKey(prev => prev + 1);
      setShowMap(true);
      console.log('✅ Map remounted with new key:', mapKey + 1);
    }, 100);
  }, []);

  // Update marker position when location changes (for web)
  useEffect(() => {
    if (Platform.OS === 'web' && markerRef.current && markerReadyRef.current && location.latitude !== 0 && location.longitude !== 0) {
      console.log('🔄 Web: Updating marker to:', location);
      try {
        // Create a proper LatLng object
        const newPosition = new (window as any).google.maps.LatLng(location.latitude, location.longitude);
        markerRef.current.position = newPosition;
        
        // Also update map center to follow marker
        if (mapRef.current) {
          mapRef.current.setCenter({ lat: location.latitude, lng: location.longitude });
        }
      } catch (error) {
        console.error('❌ Error updating marker:', error);
      }
    }
  }, [location]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up marker when component unmounts
      if (Platform.OS === 'web' && markerRef.current) {
        try {
          markerRef.current.map = null;
        } catch (error) {
          console.log('Error cleaning up marker on unmount:', error);
        }
        markerRef.current = null;
      }
      markerReadyRef.current = false; // Reset ready flag
    };
  }, []);

  const getCurrentLocation = async () => {
    if (isGettingLocation) {
      console.log('📍 Already getting location, skipping...');
      return;
    }
    
    setIsGettingLocation(true);
    try {
      console.log('📍 Getting current location...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        Alert.alert('Permission Required', 'Please enable location permissions to use this feature.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      console.log('📍 Current location:', newLocation);

      // Update location state
      setLocation(newLocation);

      // Move map to current location
      if (Platform.OS === 'web' && mapRef.current) {
        mapRef.current.setCenter({ lat: newLocation.latitude, lng: newLocation.longitude });
        mapRef.current.setZoom(15);
        
        // Update marker position with proper LatLng
        if (markerRef.current && (window as any).google && (window as any).google.maps) {
          try {
            const newPosition = new (window as any).google.maps.LatLng(newLocation.latitude, newLocation.longitude);
            markerRef.current.position = newPosition;
          } catch (error) {
            console.error('❌ Error updating marker position:', error);
          }
        }
      } else if (Platform.OS !== 'web' && mapViewRef.current) {
        // Only animate if we're currently viewing a default/different location
        // If initialLocation was provided, we skip this to avoid jumping
        mapViewRef.current.animateToRegion(
          {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000
        );
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Android Google Places API search
  const searchGooglePlaces = async (query: string) => {
    try {
      console.log('🔍 Android: Searching for:', query);
      
      const apiKey = 'AIzaSyA0bEyvVa8NecLryi5DOiEjXQvOQ3p0CfA';
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&types=geocode`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        console.log(`✅ Android: Found ${data.predictions.length} results`);
        setSearchResults(data.predictions);
      } else {
        console.log('❌ Android: No results or error:', data.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Android search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.length > 2) {
      setIsSearching(true);
      
      if (Platform.OS === 'web') {
        // Check if autocompleteService is available
        if (!autocompleteService.current) {
          console.error('❌ AutocompleteService not initialized');
          initGoogleServices();
          setIsSearching(false);
          return;
        }
        
        console.log('🔍 Searching for:', query);
        autocompleteService.current.getPlacePredictions(
          {
            input: query,
            types: ['geocode'],
          },
          (predictions: any[], status: string) => {
            console.log('📍 Search status:', status);
            if (status === 'OK' && predictions) {
              console.log(`✅ Found ${predictions.length} results`);
              setSearchResults(predictions);
            } else {
              console.log('❌ No results or error:', status);
              setSearchResults([]);
            }
            setIsSearching(false);
          }
        );
      } else {
        // Android - use Google Places API
        searchGooglePlaces(query);
      }
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (result: any) => {
    const selectedAddress = result.description || result.description;
    setSearchQuery(selectedAddress);
    setSearchResults([]);
    
    // Set address immediately from search result
    setAddress(selectedAddress);

    if (Platform.OS === 'web' && geocoder.current) {
      geocoder.current.geocode(
        { placeId: result.place_id },
        (results: any[], status: string) => {
          if (status === 'OK' && results[0]) {
            const coords = results[0].geometry.location;
            const newLocation = {
              latitude: coords.lat(),
              longitude: coords.lng(),
            };
            
            console.log('📍 Web: Setting location to:', newLocation);
            
            // Update location state first
            setLocation(newLocation);
            
            // Update address with full formatted address
            setAddress(results[0].formatted_address || selectedAddress);
            
            // Update marker position immediately
            if (markerRef.current) {
              console.log('📍 Web: Moving marker to new position');
              markerRef.current.position = { lat: newLocation.latitude, lng: newLocation.longitude };
            }
            
            // Update map center and zoom
            if (mapRef.current) {
              console.log('📍 Web: Moving map to new location');
              mapRef.current.setCenter({ lat: newLocation.latitude, lng: newLocation.longitude });
              mapRef.current.setZoom(15);
            }
          }
        }
      );
    } else {
      // Android - use Place Details API to get coordinates
      try {
        console.log('📍 Android: Getting place details for:', result.place_id);
        
        const apiKey = 'AIzaSyA0bEyvVa8NecLryi5DOiEjXQvOQ3p0CfA';
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.place_id}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.result.geometry) {
          const coords = data.result.geometry.location;
          const newLocation = {
            latitude: coords.lat,
            longitude: coords.lng,
          };
          
          console.log('✅ Android: Got coordinates:', newLocation);
          setLocation(newLocation);
          
          // Set full formatted address from place details
          if (data.result.formatted_address) {
            setAddress(data.result.formatted_address);
          }
          
          // Animate map to new location
          if (mapViewRef.current) {
            mapViewRef.current.animateToRegion(
              {
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              },
              1000
            );
          }
        }
      } catch (error) {
        console.error('❌ Android: Error getting place details:', error);
      }
    }
  };

  // Get address from coordinates using reverse geocoding
  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      if (Platform.OS === 'web' && geocoder.current) {
        geocoder.current.geocode(
          { location: { lat, lng } },
          (results: any[], status: string) => {
            if (status === 'OK' && results[0]) {
              const fullAddress = results[0].formatted_address;
              setAddress(fullAddress);
            } else {
              setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          }
        );
      } else {
        // Android - use Google Reverse Geocoding API
        const apiKey = 'AIzaSyA0bEyvVa8NecLryi5DOiEjXQvOQ3p0CfA';
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results[0]) {
          setAddress(data.results[0].formatted_address);
        } else {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  // Update address whenever location changes
  useEffect(() => {
    if (location.latitude !== 0 && location.longitude !== 0) {
      getAddressFromCoordinates(location.latitude, location.longitude);
    }
  }, [location.latitude, location.longitude]);

  // Helper function to extract clean address components
  const extractAddressComponents = (fullAddress: string) => {
    // Remove coordinates if they exist in the address
    const withoutCoords = fullAddress.replace(/\s*\(-?\d+\.?\d*,\s*-?\d+\.?\d*\)\s*$/, '').trim();
    
    // Split by comma and take first meaningful parts
    const parts = withoutCoords.split(',').map(p => p.trim()).filter(p => p);
    
    if (parts.length === 0) {
      return '';
    }
    
    // Take street address (usually first part) and city/locality (usually second or third)
    let streetName = parts[0];
    let city = '';
    
    // Look for city in the parts (usually one of the first few parts after street)
    for (let i = 1; i < Math.min(parts.length, 3); i++) {
      // Skip postal codes and numbers
      if (!/^\d+$/.test(parts[i]) && !parts[i].match(/^\d+\s/)) {
        city = parts[i];
        break;
      }
    }
    
    // Return formatted address: "Street Name, City"
    if (city) {
      return `${streetName}, ${city}`;
    }
    return streetName;
  };

  const handleConfirm = () => {
    // Extract clean address without coordinates
    const cleanAddress = address ? extractAddressComponents(address) : '';
    
    // Format final address: "Street, City (lat, lng)"
    const finalAddress = cleanAddress 
      ? `${cleanAddress} (${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})`
      : `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    
    onLocationSelect({
      latitude: location.latitude,
      longitude: location.longitude,
      address: finalAddress,
    });
  };

  // Android - use react-native-maps with Modal
  if (Platform.OS !== 'web') {
    const MapView = require('react-native-maps').default;
    const Marker = require('react-native-maps').Marker;

    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Select Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, backgroundColor: colors.surface }]}
              placeholder="Search for a location..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {isSearching && (
              <Ionicons name="hourglass" size={20} color={colors.textSecondary} />
            )}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={[styles.searchResults, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.searchResultsTitle, { color: colors.textSecondary }]}>Search Results</Text>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectSearchResult(result)}
                >
                  <Ionicons name="location" size={20} color={colors.primary} />
                  <Text style={[styles.searchResultText, { color: colors.text }]} numberOfLines={2}>
                    {result.description || result.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.mapContainer}>
            <MapView
              ref={mapViewRef}
              style={styles.map}
              region={{
                latitude: location.latitude || 24.7136,
                longitude: location.longitude || 46.6753,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onMapReady={() => {
                console.log('🗺️ Map ready at:', location);
              }}
              onPress={(e: any) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setLocation({ latitude, longitude });
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
            <Marker
              coordinate={location.latitude !== 0 ? location : { latitude: 24.7136, longitude: 46.6753 }}
              draggable
              onDragEnd={(e: any) => {
                setLocation(e.nativeEvent.coordinate);
              }}
            />
          </MapView>
          </View>

          <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Web - use @react-google-maps/api with AdvancedMarkerElement
  const { GoogleMap, LoadScript } = require('@react-google-maps/api');

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Select Location</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, backgroundColor: colors.surface }]}
            placeholder="Search for a location..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {isSearching && (
            <Ionicons name="hourglass" size={20} color={colors.textSecondary} />
          )}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={[styles.searchResults, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.searchResultsTitle, { color: colors.textSecondary }]}>Search Results</Text>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectSearchResult(result)}
              >
                <Ionicons name="location" size={20} color={colors.primary} />
                <Text style={[styles.searchResultText, { color: colors.text }]} numberOfLines={2}>
                  {result.description || result.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.mapContainer}>
        {showMap && (
        <LoadScript 
          googleMapsApiKey="AIzaSyA0bEyvVa8NecLryi5DOiEjXQvOQ3p0CfA"
          libraries={LIBRARIES}
          key={mapKey}
        >
          <GoogleMap
            key={mapKey}
            onLoad={(map: any) => {
              mapRef.current = map;
              
              // Initialize Google services now that map is loaded
              initGoogleServices();
              
              // Create AdvancedMarkerElement only if it doesn't exist
              if ((window as any).google && (window as any).google.maps && (window as any).google.maps.marker) {
                // Clear existing marker if any
                if (markerRef.current) {
                  try {
                    markerRef.current.map = null;
                  } catch (error) {
                    console.log('Error clearing old marker:', error);
                  }
                  markerRef.current = null;
                }
                
                const { AdvancedMarkerElement } = (window as any).google.maps.marker;
                
                // Use proper position - LatLng object with default if needed
                let markerPosition;
                if (location.latitude !== 0 && location.longitude !== 0) {
                  markerPosition = new (window as any).google.maps.LatLng(location.latitude, location.longitude);
                } else {
                  markerPosition = new (window as any).google.maps.LatLng(24.7136, 46.6753);
                }
                
                const marker = new AdvancedMarkerElement({
                  map,
                  position: markerPosition,
                  gmpDraggable: true,
                  title: 'Selected Location',
                });
                
                // Add dragend listener
                marker.addListener('dragend', (e: any) => {
                  const newLocation = {
                    latitude: e.latLng.lat(),
                    longitude: e.latLng.lng(),
                  };
                  setLocation(newLocation);
                });
                
                markerRef.current = marker;
                markerReadyRef.current = true; // Mark as ready
              }
              
              // Set center with proper LatLng if location exists
              if (location.latitude !== 0 && location.longitude !== 0) {
                try {
                  const centerLatLng = new (window as any).google.maps.LatLng(location.latitude, location.longitude);
                  map.setCenter(centerLatLng);
                } catch (error) {
                  console.error('Error setting center:', error);
                  // Fallback to default
                  map.setCenter({ lat: 24.7136, lng: 46.6753 });
                }
              }
            }}
            onUnmount={() => {
              // Clean up marker when component unmounts
              if (markerRef.current) {
                try {
                  markerRef.current.map = null;
                } catch (error) {
                  console.log('Error cleaning up marker:', error);
                }
                markerRef.current = null;
              }
              markerReadyRef.current = false; // Reset ready flag
            }}
            mapContainerStyle={{ flex: 1 }}
            center={location.latitude !== 0 ? location : { lat: 24.7136, lng: 46.6753 }}
            zoom={15}
            onClick={(e: any) => {
              if (e.latLng) {
                const newLocation = {
                  latitude: e.latLng.lat(),
                  longitude: e.latLng.lng(),
                };
                setLocation(newLocation);
                
                // Update marker position
                if (markerRef.current) {
                  markerRef.current.position = e.latLng;
                }
              }
            }}
            options={{
              zoomControl: true,
              mapTypeControl: false,
              mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
            }}
          />
        </LoadScript>
        )}

        {/* Floating Location Button */}
        <TouchableOpacity
          style={[styles.floatingLocationButton, { backgroundColor: colors.cardBackground }]}
          onPress={getCurrentLocation}
        >
          <Ionicons name="locate" size={24} color={colors.primary} />
        </TouchableOpacity>
        </View>

        <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  searchResults: {
    maxHeight: 200,
    borderBottomWidth: 1,
  },
  searchResultsTitle: {
    fontSize: 12,
    fontWeight: '600',
    padding: 12,
    paddingBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  searchResultText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  map: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingLocationButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
