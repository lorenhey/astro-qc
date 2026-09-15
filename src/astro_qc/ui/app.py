import streamlit as st
import pandas as pd
import altair as alt
from astro_qc.trending.db import get_trend_data

st.set_page_config(page_title="astro-qc", layout="wide")

st.title("astro-qc: Quality Control")

try:
    df = get_trend_data()
    if df.empty:
        st.warning("No QC data available. Run `astro-qc quick <file>` first.")
    else:
        st.subheader(f"Trend Analysis ({len(df)} records)")
        
        # Convert generated_at to datetime
        df['generated_at'] = pd.to_datetime(df['generated_at'])
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("### FWHM Trend")
            if 'image.psf.fwhm_median' in df.columns:
                chart = alt.Chart(df).mark_line(point=True).encode(
                    x='generated_at:T',
                    y=alt.Y('image.psf.fwhm_median:Q', title="FWHM (pixels)"),
                    tooltip=['product_id', 'generated_at', 'image.psf.fwhm_median']
                ).interactive()
                st.altair_chart(chart, use_container_width=True)
            else:
                st.info("No FWHM data.")
                
        with col2:
            st.markdown("### Background Trend")
            if 'image.background.median' in df.columns:
                chart2 = alt.Chart(df).mark_line(point=True, color='orange').encode(
                    x='generated_at:T',
                    y=alt.Y('image.background.median:Q', title="Background (ADU)"),
                    tooltip=['product_id', 'generated_at', 'image.background.median']
                ).interactive()
                st.altair_chart(chart2, use_container_width=True)
            else:
                st.info("No Background data.")
                
        st.markdown("### Raw Data")
        st.dataframe(df.sort_values("generated_at", ascending=False))
except Exception as e:
    st.error(f"Failed to load QC database: {e}")
