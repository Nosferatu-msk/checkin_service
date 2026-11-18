package com.checkin.mobile.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector
)

@Composable
fun CheckInBottomNavigation(
    items: List<BottomNavItem>,
    currentRoute: String?,
    onItemSelected: (BottomNavItem) -> Unit
) {
    NavigationBar(
        containerColor = Color.White,
        contentColor = Color(0xFF6B7280),
        tonalElevation = 0.dp,
        modifier = Modifier.height(80.dp)
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            
            NavigationBarItem(
                selected = selected,
                onClick = { onItemSelected(item) },
                icon = {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.title,
                            tint = if (selected) Color(0xFF10B981) else Color(0xFF6B7280),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = item.title,
                            fontSize = 11.sp,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (selected) Color(0xFF10B981) else Color(0xFF6B7280)
                        )
                    }
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Color(0xFF10B981),
                    unselectedIconColor = Color(0xFF6B7280),
                    indicatorColor = Color.Transparent
                )
            )
        }
    }
}
