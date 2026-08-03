import sys
import argparse
import joblib
import pandas as pd

def main():
    parser = argparse.ArgumentParser(description="Predict Uber trip fare using the trained model.")
    parser.add_argument("--distance", type=float, required=True, help="Distance in km")
    parser.add_argument("--hour", type=int, required=True, help="Hour of the day (0-23)")
    
    args = parser.parse_args()
    
    try:
        model = joblib.load('csv/fare_predictor_model.pkl')
        df = pd.DataFrame([{
            'distance_km': args.distance,
            'hour': args.hour
        }])
        prediction = model.predict(df)[0]
        # Print only the numerical prediction so the caller can parse it easily
        print(f"{prediction:.2f}")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
