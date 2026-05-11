import plotly.graph_objects as go
import random

#----------------------------------------------------------------------#
#------------------- Simulated attack data ------------------#
#----------------------------------------------------------------------#

countries = {
    "India": (20.5937, 78.9629),
    "USA": (37.0902, -95.7129),
    "Russia": (61.5240, 105.3188),
    "China": (35.8617, 104.1954),
    "Germany": (51.1657, 10.4515),
    "Japan": (36.2048, 138.2529),
    "Brazil": (-14.2350, -51.9253),
    "Australia": (-25.2744, 133.7751)
}

fig = go.Figure()
#----------------------------------------------------------------------#
#--------------------- Simulated attacks--------------------------------#
#----------------------------------------------------------------------#


for i in range(20):

    source, target = random.sample(list(countries.keys()), 2)

    lat1, lon1 = countries[source]
    lat2, lon2 = countries[target]

  
    fig.add_trace(
        go.Scattergeo(
            lon=[lon1, lon2],
            lat=[lat1, lat2],

            mode='lines',

            line=dict(
                width=3,
                color='red'
            ),

            opacity=0.8,

            name=f"{source} → {target}"
        )
    )

    
    fig.add_trace(
        go.Scattergeo(
            lon=[lon1],
            lat=[lat1],

            mode='markers',

            marker=dict(
                size=8,
                color='yellow'
            ),

            showlegend=False
        )
    )


fig.update_layout(

    title='Real-Time DNS Attack Visualization System',

    geo=dict(
        projection_type='orthographic',

        showland=True,
        landcolor='rgb(20,20,20)',

        showocean=True,
        oceancolor='rgb(0,0,40)',

        showcountries=True,

        bgcolor='black'
    ),

    paper_bgcolor='black',
    font=dict(color='white')
)

fig.show()