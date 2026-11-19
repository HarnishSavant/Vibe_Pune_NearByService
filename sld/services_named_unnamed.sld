<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>services</Name>
    <UserStyle>
      <Title>Services Named vs Unnamed</Title>
      <Abstract>Green circles for named services, red triangles for unnamed services.</Abstract>
      <FeatureTypeStyle>
        <!-- Rule 1: Named services (green circle) -->
        <Rule>
          <Name>Named Services</Name>
          <Title>Named Service</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:Not>
                <ogc:PropertyIsNull>
                  <ogc:PropertyName>name</ogc:PropertyName>
                </ogc:PropertyIsNull>
              </ogc:Not>
              <ogc:Not>
                <ogc:PropertyIsEqualTo>
                  <ogc:PropertyName>name</ogc:PropertyName>
                  <ogc:Literal></ogc:Literal>
                </ogc:PropertyIsEqualTo>
              </ogc:Not>
            </ogc:And>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#22c55e</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#15803d</CssParameter>
                  <CssParameter name="stroke-width">0.5</CssParameter>
                </Stroke>
              </Mark>
              <Size>8</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
        <!-- Rule 2: Unnamed services (red triangle) -->
        <Rule>
          <Name>Unnamed Services</Name>
          <Title>Unnamed Service</Title>
          <ogc:Filter>
            <ogc:Or>
              <ogc:PropertyIsNull>
                <ogc:PropertyName>name</ogc:PropertyName>
              </ogc:PropertyIsNull>
              <ogc:PropertyIsEqualTo>
                <ogc:PropertyName>name</ogc:PropertyName>
                <ogc:Literal></ogc:Literal>
              </ogc:PropertyIsEqualTo>
            </ogc:Or>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>triangle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#ef4444</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#991b1b</CssParameter>
                  <CssParameter name="stroke-width">0.5</CssParameter>
                </Stroke>
              </Mark>
              <Size>8</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>