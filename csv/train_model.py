import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import matplotlib.pyplot as plt

def main():
    print("🚀 Loading dataset...")
    csv_path = 'csv/uber_trips_dataset_50k.csv'
    
    if not os.path.exists(csv_path):
        print(f"❌ Dataset not found at {csv_path}")
        return

    df = pd.read_csv(csv_path)
    print(f"📊 Loaded {len(df)} rows. Columns: {list(df.columns)}")

    # 1. Data cleaning and preprocessing
    print("🧹 Cleaning data...")
    # Drop rows with missing values in key columns
    df = df.dropna(subset=['distance_km', 'fare_amount', 'pickup_time'])
    # Filter out invalid values (negative distances or fares)
    df = df[(df['distance_km'] > 0) & (df['fare_amount'] > 0)]

    # 2. Feature engineering
    print("⚙️ Extracting features...")
    # Convert pickup_time to datetime
    df['pickup_time'] = pd.to_datetime(df['pickup_time'])
    # Extract hour of day
    df['hour'] = df['pickup_time'].dt.hour
    # Convert fare to rupees (fare_amount * 40)
    df['fare_rupees'] = df['fare_amount'] * 40

    # 3. Model preparation
    X = df[['distance_km', 'hour']]
    y = df['fare_rupees']

    print(f"✂️ Splitting data into train/test sets...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Train Random Forest Regressor
    print("🧠 Training Random Forest Regressor (this may take a few seconds)...")
    # Using 100 estimators and max_depth=12 for a good balance of accuracy and speed
    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    print("✅ Model training complete!")

    # 5. Evaluate the model
    print("📝 Evaluating model...")
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print("\n================ MODEL PERFORMANCE ================")
    print(f"Mean Absolute Error (MAE): Rs. {mae:.2f}")
    print(f"Root Mean Squared Error (RMSE): Rs. {rmse:.2f}")
    print(f"R-squared (R2) Score: {r2:.4f}")
    print("===================================================\n")

    # 6. Save the trained model
    model_file = 'csv/fare_predictor_model.pkl'
    joblib.dump(model, model_file)
    print(f"💾 Saved model to {model_file}")

    # 7. Create a nice visualization: price variation for a fixed distance (10km) across the day
    print("📈 Creating visualization...")
    hours = np.arange(0, 24)
    fixed_distance = 10.0 # 10 km
    
    # Predict for each hour at 10km distance
    predict_data = pd.DataFrame({
        'distance_km': [fixed_distance] * 24,
        'hour': hours
      })
    predicted_fares = model.predict(predict_data)

    plt.figure(figsize=(10, 6))
    # Dark modern styling for the plot
    plt.style.use('dark_background')
    
    plt.plot(hours, predicted_fares, color='#A855F7', marker='o', linewidth=2.5, markersize=8, label='Predicted Fare')
    plt.fill_between(hours, predicted_fares, alpha=0.15, color='#A855F7')
    
    plt.title(f'Predicted Uber Fare Variation Across Time of Day\n(For a fixed {fixed_distance} km trip)', fontsize=14, fontweight='bold', pad=15)
    plt.xlabel('Hour of the Day (24h format)', fontsize=11)
    plt.ylabel('Fare (in Rupees ₹)', fontsize=11)
    plt.grid(True, linestyle='--', alpha=0.3)
    plt.xticks(hours)
    plt.xlim(0, 23)
    
    # Highlight peak hours or surge patterns
    max_idx = np.argmax(predicted_fares)
    min_idx = np.argmin(predicted_fares)
    plt.annotate(f'Peak: ₹{predicted_fares[max_idx]:.2f}', 
                 xy=(max_idx, predicted_fares[max_idx]), 
                 xytext=(max_idx-1.5, predicted_fares[max_idx]+15),
                 arrowprops=dict(facecolor='#10B981', shrink=0.05, width=1, headwidth=6))
                 
    plt.annotate(f'Low: ₹{predicted_fares[min_idx]:.2f}', 
                 xy=(min_idx, predicted_fares[min_idx]), 
                 xytext=(min_idx-1.5, predicted_fares[min_idx]-25),
                 arrowprops=dict(facecolor='#F43F5E', shrink=0.05, width=1, headwidth=6))

    plot_path = 'csv/price_variation_by_hour.png'
    plt.tight_layout()
    plt.savefig(plot_path, dpi=150)
    plt.close()
    print(f"🖼️ Saved visualization to {plot_path}")

if __name__ == '__main__':
    main()
